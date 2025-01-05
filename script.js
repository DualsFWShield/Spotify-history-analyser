// script.js
let listeningTimeChart, genreChart, dayOfWeekChart, hourOfDayChart, topAlbumChart;
let originalData = [];

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  ['weeklyChartType', 'hourlyChartType', 'albumChartType'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (originalData.length) {
        updateStats(filterData(originalData));
      }
    });
  });
});

function initializeEventListeners() {
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
  document.getElementById('exportImageBtn').addEventListener('click', exportToImage);
  document.getElementById('applyFiltersBtn').addEventListener('click', () => updateStats(filterData(originalData)));
}

// script.js - Mise à jour de handleFileUpload
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      let data = JSON.parse(ev.target.result);
      // Si c'est un objet unique, le convertir en tableau
      if (!Array.isArray(data)) {
        data = [data];
      }
      originalData = data;
      document.getElementById('stats').classList.remove('hidden');
      document.getElementById('advancedFilters').classList.remove('hidden');
      updateStats(originalData);
    } catch (err) {
      console.error('Erreur parsing JSON:', err);
      alert('Erreur : fichier JSON invalide.');
    }
  };
  reader.readAsText(file);
}

function filterData(data) {
  const artistFilter = document.getElementById('artistFilter').value.toLowerCase();
  const keywordFilter = document.getElementById('keywordFilter').value.toLowerCase();
  const startDate = document.getElementById('startDate').valueAsDate;
  const endDate = document.getElementById('endDate').valueAsDate;

  return data.filter(item => {
    const artist = (item.master_metadata_album_artist_name || 'inconnu').toLowerCase();
    const track = (item.master_metadata_track_name || 'inconnu').toLowerCase();
    const tsDate = new Date(item.ts);

    if (artistFilter && !artist.includes(artistFilter)) return false;
    if (keywordFilter && !track.includes(keywordFilter)) return false;
    if (startDate && tsDate < startDate) return false;
    if (endDate) {
      endDate.setHours(23,59,59,999);
      if (tsDate > endDate) return false;
    }
    return true;
  });
}

// Mise à jour de updateStats()
function updateStats(data) {
  // Historique
  renderHistory(data);

  // Heures totales
  const totalMs = data.reduce((acc, el) => acc + el.ms_played, 0);
  document.getElementById('totalHours').textContent = (totalMs / 1000 / 60 / 60).toFixed(2);

  // Total écoutes
  document.getElementById('totalPlays').textContent = data.length;

  // Artiste le plus écouté
  const mapArtist = {};
  data.forEach(item => {
    const a = item.master_metadata_album_artist_name || 'Inconnu';
    mapArtist[a] = (mapArtist[a] || 0) + item.ms_played;
  });
  const topArtist = Object.entries(mapArtist).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('topArtist').textContent = topArtist ? topArtist[0] : 'N/A';

  // Top 5 chansons
  const trackMap = {};
  data.forEach(item => {
    const t = item.master_metadata_track_name || 'Inconnu';
    trackMap[t] = (trackMap[t] || 0) + item.ms_played;
  });
  const sortedTracks = Object.entries(trackMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const ulFav = document.getElementById('favorites');
  ulFav.innerHTML = '';
  sortedTracks.forEach(([tName]) => {
    const fromData = data.find(el => el.master_metadata_track_name === tName && el.spotify_track_uri);
    const linkUri = fromData 
      ? fromData.spotify_track_uri.replace('spotify:track:','https://open.spotify.com/track/') 
      : '#';
    const li = document.createElement('li');
    li.innerHTML = `<a href="${linkUri}" target="_blank">${tName}</a>`;
    ulFav.appendChild(li);
  });

  // Récolte & affichage stats
  const monthlyChartType = document.getElementById('monthlyChartType').value;
  const artistChartType = document.getElementById('artistChartType').value;
  const weeklyChartType = document.getElementById('weeklyChartType').value;
  const hourlyChartType = document.getElementById('hourlyChartType').value;
  const albumChartType = document.getElementById('albumChartType').value;

  const monthlyHours = groupByMonth(data);
  const topArtists = getTopArtists(data);
  const weeklyHours = getWeeklyHours(data);
  const hourlyHours = getHourlyHours(data);
  const { albumLabels, albumDataHours } = getTopAlbums(data);

  initializeCharts(
    monthlyHours, 
    topArtists, 
    weeklyHours, 
    hourlyHours, 
    albumLabels, 
    albumDataHours, 
    monthlyChartType, 
    artistChartType,
    weeklyChartType,
    hourlyChartType,
    albumChartType
  );
}

function renderHistory(data) {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';
  data.forEach(item => {
    const track = item.master_metadata_track_name || 'Inconnu';
    const artist = item.master_metadata_album_artist_name || 'Inconnu';
    const spotifyUri = item.spotify_track_uri
      ? item.spotify_track_uri.replace('spotify:track:','https://open.spotify.com/track/')
      : '#';
    const div = document.createElement('div');
    div.className = 'mb-2';
    div.innerHTML = `${new Date(item.ts).toLocaleString()} - <strong>${artist}</strong> / <a href="${spotifyUri}" target="_blank">${track}</a>`;
    historyList.appendChild(div);
  });
}

function groupByMonth(data) {
  const monthlyHours = new Array(12).fill(0);
  data.forEach(item => {
    const m = new Date(item.ts).getMonth();
    monthlyHours[m] += item.ms_played;
  });
  return monthlyHours.map(ms => ms/1000/60/60);
}

function getTopArtists(data) {
  const count = {};
  data.forEach(item => {
    const a = item.master_metadata_album_artist_name || 'Inconnu';
    count[a] = (count[a] || 0) + item.ms_played;
  });
  const sorted = Object.entries(count).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return {
    labels: sorted.map(([k]) => k),
    dataHours: sorted.map(([,v]) => v/1000/60/60),
  };
}

function getWeeklyHours(data) {
  const arr = new Array(7).fill(0);
  data.forEach(item => {
    arr[new Date(item.ts).getDay()] += item.ms_played;
  });
  return arr.map(ms => ms/1000/60/60);
}

function getHourlyHours(data) {
  const arr = new Array(24).fill(0);
  data.forEach(item => {
    arr[new Date(item.ts).getHours()] += item.ms_played;
  });
  return arr.map(ms => ms/1000/60/60);
}

function getTopAlbums(data) {
  const albumCount = {};
  data.forEach(item => {
    const alb = item.master_metadata_album_album_name || 'Inconnu';
    albumCount[alb] = (albumCount[alb] || 0) + item.ms_played;
  });
  const sorted = Object.entries(albumCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return {
    albumLabels: sorted.map(([a])=>a),
    albumDataHours: sorted.map(([,v])=>v/1000/60/60)
  };
}

// Mise à jour de initializeCharts
function initializeCharts(
  monthlyHours, 
  topArtists, 
  weeklyHours, 
  hourlyHours, 
  albumLabels, 
  albumDataHours, 
  monthlyChartType, 
  artistChartType,
  weeklyChartType,
  hourlyChartType,
  albumChartType
) {
  // Destruction des charts existants
  [listeningTimeChart, genreChart, dayOfWeekChart, hourOfDayChart, topAlbumChart].forEach(chart => {
    if (chart) chart.destroy();
  });

  // Récupération des contextes avec vérification
  const contexts = {
    listening: document.getElementById('listeningTimeChart')?.getContext('2d'),
    genre: document.getElementById('genreChart')?.getContext('2d'),
    dayOfWeek: document.getElementById('dayOfWeekChart')?.getContext('2d'),
    hourOfDay: document.getElementById('hourOfDayChart')?.getContext('2d'),
    topAlbum: document.getElementById('topAlbumChart')?.getContext('2d')
  };

  // Vérification que tous les contextes sont disponibles
  if (!Object.values(contexts).every(ctx => ctx)) {
    console.error('Certains éléments canvas sont manquants');
    return;
  }

  // Initialisation des charts
  listeningTimeChart = new Chart(contexts.listening, {
    type: monthlyChartType || 'bar',
    data: {
      labels: ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'],
      datasets: [{
        label: 'Heures/Mois',
        data: monthlyHours,
        backgroundColor: 'rgba(29,185,84,0.3)',
        borderColor: '#1db954',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: defaultChartOptions()
  });

  genreChart = new Chart(contexts.genre, {
    type: artistChartType || 'doughnut',
    data: {
      labels: topArtists.labels,
      datasets: [{
        label: 'Top Artistes',
        data: topArtists.dataHours,
        backgroundColor: ['#1db954','#e74c3c','#f1c40f','#3498db','#9b59b6']
      }]
    },
    options: defaultChartOptions()
  });

  dayOfWeekChart = new Chart(contexts.dayOfWeek, {
    type: weeklyChartType || 'polarArea',
    data: {
      labels: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
      datasets: [{
        label: 'Heures/Jour',
        data: weeklyHours,
        backgroundColor: ['#1abc9c','#3498db','#9b59b6','#f1c40f','#e74c3c','#16a085','#f39c12'],
        borderColor: '#1abc9c',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: defaultChartOptions()
  });

  hourOfDayChart = new Chart(contexts.hourOfDay, {
    type: hourlyChartType || 'bubble',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}h`),
      datasets: [{
        label: 'Heures/Heure',
        data: hourlyChartType === 'bubble' || hourlyChartType === 'scatter' 
          ? hourlyHours.map((h,i) => ({x:i, y:h, r:Math.sqrt(h*10+5)}))
          : hourlyHours,
        backgroundColor: hourlyChartType === 'doughnut' || hourlyChartType === 'pie' || hourlyChartType === 'polarArea'
          ? [
              '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
              '#D4A5A5', '#9B6B6B', '#E9B872', '#7FB069', '#D65076',
              '#6B5B95', '#FEC84E', '#FF7B9C', '#4B86B4', '#2A363B',
              '#FF847C', '#99B898', '#FECEA8', '#45B7D1', '#2E003E',
              '#D1B6E1', '#BE9EC9', '#6C5B7B', '#355C7D'
            ]
          : '#3498db',
        borderColor: '#3498db',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: defaultChartOptions()
  });

  topAlbumChart = new Chart(contexts.topAlbum, {
    type: albumChartType || 'radar',
    data: {
      labels: albumLabels,
      datasets: [{
        label: 'Top Albums',
        data: albumDataHours,
        backgroundColor: albumChartType === 'doughnut' || albumChartType === 'pie' || albumChartType === 'polarArea'
          ? ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3']
          : 'rgba(233,30,99,0.3)',
        borderColor: albumChartType === 'doughnut' || albumChartType === 'pie' || albumChartType === 'polarArea'
          ? ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3']
          : '#e91e63',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: defaultChartOptions()
  });
}

function defaultChartOptions() {
  return {
    responsive: true,
    plugins: {
      legend: { display: true, labels: { color: '#fff' } }
    },
    scales: {
      x: { ticks: { color: '#fff' } },
      y: { ticks: { color: '#fff' } }
    }
  };
}

/* Correction: export du contenu de l'ID "stats" */
function exportToPDF() {
  const container = document.getElementById('stats');
  html2canvas(container).then(canvas => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','mm','a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
    pdf.save('Statistiques.pdf');
  });
}

function exportToImage() {
  const container = document.getElementById('stats');
  html2canvas(container).then(canvas => {
    const link = document.createElement('a');
    link.download = 'Statistiques.png';
    link.href = canvas.toDataURL();
    link.click();
  });
}

function exportToJSON() {
  const obj = { message: 'Résumé JSON à personnaliser...' };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(obj));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', 'resume.json');
  dlAnchor.click();
}

function shareData() {
  const shareData = {
    title: 'Mon Wrapped de l\'écoute musicale',
    text: 'Découvrez mes stats incroyables !',
    url: window.location.href
  };
  navigator.share(shareData).catch(err => console.error('Partage échoué:', err));
}