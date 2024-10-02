// Écouter les changements sur l'input de fichier
document.getElementById('fileInput').addEventListener('change', handleFile, false);

// Écouter les événements de recherche et de filtrage
document.getElementById('searchInput').addEventListener('input', filterHistory, false);
document.getElementById('countryFilter').addEventListener('change', filterHistory, false);

// Écouter les événements d'exportation
document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF, false);
document.getElementById('exportImageBtn').addEventListener('click', exportToImage, false);

// Variables globales pour stocker les données
let allData = [];
let filteredData = [];
let uniqueCountries = new Set();

// Variables pour la pagination
const rowsPerPage = 50;
let currentPage = 1;
let totalPages = 1;

// Variables pour les graphiques
let hoursChart, topTracksChart, platformChart, countryChart, weeklyHoursChart, reasonEndChart, incognitoChart, platformUsageChart;

// Fonction pour gérer l'importation du fichier JSON
function handleFile(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("Veuillez sélectionner un fichier.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);

            // Vérifier si les données sont un objet unique et les envelopper dans un tableau
            if (!Array.isArray(data)) {
                data = [data];
            }

            processData(data);
        } catch (error) {
            alert("Erreur lors de la lecture du fichier JSON. Assurez-vous que le fichier est correctement formaté.");
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// Fonction pour traiter les données JSON
function processData(data) {
    // Vérifier que les données sont un tableau
    if (!Array.isArray(data)) {
        alert("Le fichier JSON doit contenir un tableau d'enregistrements.");
        return;
    }

    allData = data;
    filteredData = data;
    uniqueCountries = new Set(data.map(record => record.conn_country || "Inconnu"));

    // Mettre à jour le filtre des pays
    updateCountryFilter();

    // Calculer les statistiques générales
    calculateGeneralStats();

    // Générer les visualisations
    generateCharts();

    // Remplir les listes et tables
    fillTopTracks();
    fillHistoryTable();

    // Afficher les statistiques
    document.getElementById('stats').classList.remove('hidden');
}

// Fonction pour mettre à jour le filtre des pays
function updateCountryFilter() {
    const countryFilter = document.getElementById('countryFilter');
    countryFilter.innerHTML = '<option value="">Tous les Pays</option>';
    Array.from(uniqueCountries).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// Fonction pour calculer les statistiques générales
function calculateGeneralStats() {
    const totalMs = filteredData.reduce((acc, record) => acc + (record.ms_played || 0), 0);
    const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(2);
    document.getElementById('totalHours').textContent = totalHours;

    const totalTracks = filteredData.length;
    document.getElementById('totalTracks').textContent = totalTracks;

    const countries = new Set(filteredData.map(record => record.conn_country || "Inconnu"));
    document.getElementById('uniqueCountries').textContent = countries.size;
}

// Fonction pour générer les graphiques avec Chart.js
function generateCharts() {
    // Détruire les graphiques existants si présents
    destroyCharts();

    // Temps d'écoute par mois
    const listenByMonth = {};
    filteredData.forEach(record => {
        const date = new Date(record.ts);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        listenByMonth[month] = (listenByMonth[month] || 0) + (record.ms_played || 0);
    });
    const months = Object.keys(listenByMonth).sort();
    const hoursPerMonth = months.map(month => (listenByMonth[month] / (1000 * 60 * 60)).toFixed(2));

    const ctxHours = document.getElementById('hoursChart').getContext('2d');
    hoursChart = new Chart(ctxHours, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Heures Écoutées',
                data: hoursPerMonth,
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Heures' } },
                x: { title: { display: true, text: 'Mois' } }
            }
        }
    });

    // Chansons préférées (Top 10)
    const trackCounts = {};
    filteredData.forEach(record => {
        const track = record.master_metadata_track_name || "Inconnu";
        trackCounts[track] = (trackCounts[track] || 0) + (record.ms_played || 0);
    });
    const sortedTracks = Object.entries(trackCounts).sort((a, b) => b[1] - a[1]);
    const topTracks = sortedTracks.slice(0, 10);
    const topTracksLabels = topTracks.map(item => item[0]);
    const topTracksData = topTracks.map(item => (item[1] / (1000 * 60 * 60)).toFixed(2));

    const ctxTopTracks = document.getElementById('topTracksChart').getContext('2d');
    topTracksChart = new Chart(ctxTopTracks, {
        type: 'bar',
        data: {
            labels: topTracksLabels,
            datasets: [{
                label: 'Heures Écoutées',
                data: topTracksData,
                backgroundColor: 'rgba(23, 162, 184, 0.6)',
                borderColor: 'rgba(23, 162, 184, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Heures' } },
                x: { 
                    title: { display: true, text: 'Chansons' },
                    ticks: { 
                        autoSkip: false,
                        maxRotation: 90,
                        minRotation: 45
                    }
                }
            }
        }
    });

    // Plateformes utilisées
    const platformCounts = {};
    filteredData.forEach(record => {
        const platform = record.platform || "Inconnu";
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });
    const platforms = Object.keys(platformCounts);
    const platformData = Object.values(platformCounts);

    const ctxPlatform = document.getElementById('platformChart').getContext('2d');
    platformChart = new Chart(ctxPlatform, {
        type: 'pie',
        data: {
            labels: platforms,
            datasets: [{
                label: 'Plateformes',
                data: platformData,
                backgroundColor: generateColor(platforms.length)
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { position: 'bottom' },
                tooltip: { enabled: true }
            }
        }
    });

    // Distribution des pays
    const countryCounts = {};
    filteredData.forEach(record => {
        const country = record.conn_country || "Inconnu";
        countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    const countries = Object.keys(countryCounts);
    const countryData = Object.values(countryCounts);

    const ctxCountry = document.getElementById('countryChart').getContext('2d');
    countryChart = new Chart(ctxCountry, {
        type: 'doughnut',
        data: {
            labels: countries,
            datasets: [{
                label: 'Pays',
                data: countryData,
                backgroundColor: generateColor(countries.length)
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { position: 'bottom' },
                tooltip: { enabled: true }
            }
        }
    });

    // Temps d'écoute par semaine
    const listenByWeek = {};
    filteredData.forEach(record => {
        const date = new Date(record.ts);
        const week = getWeekNumber(date);
        listenByWeek[week] = (listenByWeek[week] || 0) + (record.ms_played || 0);
    });
    const weeks = Object.keys(listenByWeek).sort();
    const hoursPerWeek = weeks.map(week => (listenByWeek[week] / (1000 * 60 * 60)).toFixed(2));

    const ctxWeeklyHours = document.getElementById('weeklyHoursChart').getContext('2d');
    weeklyHoursChart = new Chart(ctxWeeklyHours, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [{
                label: 'Heures Écoutées',
                data: hoursPerWeek,
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Heures' } },
                x: { title: { display: true, text: 'Semaine' } }
            }
        }
    });

    // Raisons de fin de lecture
    const reasonEndCounts = {};
    filteredData.forEach(record => {
        const reason = record.reason_end || "Inconnu";
        reasonEndCounts[reason] = (reasonEndCounts[reason] || 0) + 1;
    });
    const reasons = Object.keys(reasonEndCounts);
    const reasonsData = Object.values(reasonEndCounts);

    const ctxReasonEnd = document.getElementById('reasonEndChart').getContext('2d');
    reasonEndChart = new Chart(ctxReasonEnd, {
        type: 'bar',
        data: {
            labels: reasons,
            datasets: [{
                label: 'Nombre de Fins',
                data: reasonsData,
                backgroundColor: 'rgba(255, 193, 7, 0.6)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Nombre' } },
                x: { title: { display: true, text: 'Raison de Fin' } }
            }
        }
    });

    // Utilisation du mode incognito
    const incognitoCounts = { "Oui": 0, "Non": 0 };
    filteredData.forEach(record => {
        const incognito = record.incognito_mode ? "Oui" : "Non";
        incognitoCounts[incognito] = (incognitoCounts[incognito] || 0) + 1;
    });
    const incognitoLabels = Object.keys(incognitoCounts);
    const incognitoData = Object.values(incognitoCounts);

    const ctxIncognito = document.getElementById('incognitoChart').getContext('2d');
    incognitoChart = new Chart(ctxIncognito, {
        type: 'pie',
        data: {
            labels: incognitoLabels,
            datasets: [{
                label: 'Mode Incognito',
                data: incognitoData,
                backgroundColor: ['rgba(108, 117, 125, 0.6)', 'rgba(23, 162, 184, 0.6)']
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { position: 'bottom' },
                tooltip: { enabled: true }
            }
        }
    });

    // Utilisation des plateformes
    const platformUsage = {};
    filteredData.forEach(record => {
        const platform = record.platform || "Inconnu";
        platformUsage[platform] = (platformUsage[platform] || 0) + 1;
    });
    const platformUsageLabels = Object.keys(platformUsage);
    const platformUsageData = Object.values(platformUsage);

    const ctxPlatformUsage = document.getElementById('platformUsageChart').getContext('2d');
    platformUsageChart = new Chart(ctxPlatformUsage, {
        type: 'bar',
        data: {
            labels: platformUsageLabels,
            datasets: [{
                label: 'Nombre d\'Utilisations',
                data: platformUsageData,
                backgroundColor: generateColor(platformUsageLabels.length)
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: { beginAtZero: true, title: { display: true, text: 'Nombre' } },
                y: { title: { display: true, text: 'Plateforme' } }
            }
        }
    });
}

// Fonction pour détruire les graphiques existants
function destroyCharts() {
    if (hoursChart) hoursChart.destroy();
    if (topTracksChart) topTracksChart.destroy();
    if (platformChart) platformChart.destroy();
    if (countryChart) countryChart.destroy();
    if (weeklyHoursChart) weeklyHoursChart.destroy();
    if (reasonEndChart) reasonEndChart.destroy();
    if (incognitoChart) incognitoChart.destroy();
    if (platformUsageChart) platformUsageChart.destroy();
}

// Fonction pour remplir la liste des chansons préférées
function fillTopTracks() {
    const trackCounts = {};
    filteredData.forEach(record => {
        const track = record.master_metadata_track_name || "Inconnu";
        trackCounts[track] = (trackCounts[track] || 0) + (record.ms_played || 0);
    });

    const sortedTracks = Object.entries(trackCounts).sort((a, b) => b[1] - a[1]);
    const topTracks = sortedTracks.slice(0, 10);

    const topTracksList = document.getElementById('topTracksList');
    topTracksList.innerHTML = "";
    topTracks.forEach(([track, ms]) => {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item', 'd-flex', 'align-items-center', 'animate__animated', 'animate__fadeInUp');

        // Texte de la chanson
        const textDiv = document.createElement('div');
        textDiv.classList.add('ms-3');
        textDiv.innerHTML = `<strong>${track}</strong><br>Durée Écoutée : ${(ms / (1000 * 60)).toFixed(2)} min`;

        // Liens Spotify
        const spotifyLink = document.createElement('a');
        spotifyLink.href = "#"; // À remplacer par le lien Spotify si disponible
        spotifyLink.target = "_blank";
        spotifyLink.classList.add('btn', 'btn-success', 'btn-sm', 'ms-auto');
        spotifyLink.innerHTML = '<i class="fab fa-spotify"></i>';

        // Ajouter le lien Spotify si disponible
        const record = allData.find(r => (r.master_metadata_track_name || "Inconnu") === track);
        if (record && record.spotify_track_uri) {
            spotifyLink.href = `https://open.spotify.com/track/${record.spotify_track_uri.split(':').pop()}`;
            listItem.appendChild(spotifyLink);
        }

        listItem.appendChild(textDiv);

        topTracksList.appendChild(listItem);
    });
}

// Fonction pour remplir la table de l'historique avec pagination
function fillHistoryTable() {
    const historyTableBody = document.querySelector('#historyTable tbody');
    historyTableBody.innerHTML = "";

    // Calculer le nombre total de pages
    totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Déterminer les données à afficher sur la page actuelle
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    pageData.sort((a, b) => new Date(b.ts) - new Date(a.ts)); // Trier par date décroissante
    pageData.forEach(record => {
        const tr = document.createElement('tr');

        // Date
        const dateTd = document.createElement('td');
        const date = new Date(record.ts);
        dateTd.textContent = date.toLocaleString();
        tr.appendChild(dateTd);

        // Chanson
        const trackTd = document.createElement('td');
        trackTd.textContent = record.master_metadata_track_name || "Inconnu";
        tr.appendChild(trackTd);

        // Artiste
        const artistTd = document.createElement('td');
        artistTd.textContent = record.master_metadata_album_artist_name || "Inconnu";
        tr.appendChild(artistTd);

        // Durée Écoutée
        const durationTd = document.createElement('td');
        durationTd.textContent = `${(record.ms_played / 1000).toFixed(0)} s`;
        tr.appendChild(durationTd);

        // Pays
        const countryTd = document.createElement('td');
        countryTd.textContent = record.conn_country || "Inconnu";
        tr.appendChild(countryTd);

        // Plateforme
        const platformTd = document.createElement('td');
        platformTd.textContent = record.platform || "Inconnu";
        tr.appendChild(platformTd);

        // Lien Spotify
        const spotifyTd = document.createElement('td');
        if (record.spotify_track_uri) {
            const link = document.createElement('a');
            link.href = `https://open.spotify.com/track/${record.spotify_track_uri.split(':').pop()}`;
            link.target = "_blank";
            link.innerHTML = '<i class="fab fa-spotify fa-lg text-success"></i>';
            spotifyTd.appendChild(link);
        } else {
            spotifyTd.textContent = "N/A";
        }
        tr.appendChild(spotifyTd);

        historyTableBody.appendChild(tr);
    });

    // Mettre à jour les contrôles de pagination
    updatePagination();
}

// Fonction de recherche et de filtrage
function filterHistory() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedCountry = document.getElementById('countryFilter').value;

    filteredData = allData.filter(record => {
        const trackName = (record.master_metadata_track_name || "").toLowerCase();
        const country = record.conn_country || "Inconnu";

        const matchesSearch = trackName.includes(searchTerm);
        const matchesCountry = selectedCountry === "" || country === selectedCountry;

        return matchesSearch && matchesCountry;
    });

    currentPage = 1; // Réinitialiser à la première page

    calculateGeneralStats();
    generateCharts();
    fillTopTracks();
    fillHistoryTable();
}

// Fonction pour obtenir le numéro de semaine
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-S${weekNo}`;
}

// Fonction pour générer des couleurs aléatoires
function generateColor(count) {
    const colors = [];
    for(let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colors.push(`rgba(${r}, ${g}, ${b}, 0.6)`);
    }
    return colors;
}

// Fonction pour mettre à jour les contrôles de pagination
function updatePagination(currentPage, totalPages) {
    const pagination = document.querySelector('.pagination');
    pagination.innerHTML = ''; // Vider l'élément de pagination
    
    const maxVisiblePages = 5; // Nombre de pages visibles à la fois
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Ajuster si nous sommes près du début ou de la fin
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Bouton "Précédent"
    if (currentPage > 1) {
        const prevLink = document.createElement('a');
        prevLink.classList.add('pagelink');
        prevLink.textContent = 'Précédent';
        prevLink.href = '#';
        prevLink.addEventListener('click', function() {
            updatePagination(currentPage - 1, totalPages);
            fillHistoryTable(currentPage - 1); // Mettre à jour le tableau d'historique
        });
        pagination.appendChild(prevLink);
    }

    // Pages numérotées
    for (let i = startPage; i <= endPage; i++) {
        const pageLink = document.createElement('a');
        pageLink.classList.add('pagelink');
        if (i === currentPage) {
            pageLink.classList.add('active'); // Marquer la page actuelle
        }
        pageLink.textContent = i;
        pageLink.href = '#';
        pageLink.addEventListener('click', function() {
            updatePagination(i, totalPages);
            fillHistoryTable(i); // Mettre à jour le tableau d'historique
        });
        pagination.appendChild(pageLink);
    }

    // Bouton "Suivant"
    if (currentPage < totalPages) {
        const nextLink = document.createElement('a');
        nextLink.classList.add('pagelink');
        nextLink.textContent = 'Suivant';
        nextLink.href = '#';
        nextLink.addEventListener('click', function() {
            updatePagination(currentPage + 1, totalPages);
            fillHistoryTable(currentPage + 1); // Mettre à jour le tableau d'historique
        });
        pagination.appendChild(nextLink);
    }
}


// Fonction pour exporter les statistiques en PDF
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Titre
    doc.setFontSize(20);
    doc.text("Statistiques d'Écoute", 105, 15, { align: "center" });

    // Statistiques Générales
    doc.setFontSize(12);
    doc.text(`Heures Totales d'Écoute : ${document.getElementById('totalHours').textContent} heures`, 10, 25);
    doc.text(`Nombre Total de Chansons Écoutées : ${document.getElementById('totalTracks').textContent}`, 10, 32);
    doc.text(`Nombre de Pays Visités : ${document.getElementById('uniqueCountries').textContent}`, 10, 39);

    // Ajouter les graphiques
    const charts = ['hoursChart', 'topTracksChart', 'platformChart', 'countryChart', 'weeklyHoursChart', 'reasonEndChart', 'incognitoChart', 'platformUsageChart'];
    let yPosition = 45;

    for (const chartId of charts) {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            const imgData = canvas.toDataURL('image/png', 1.0);
            doc.addImage(imgData, 'PNG', 10, yPosition, 190, 100);
            yPosition += 105;
            if (yPosition > 270) { // Ajouter une nouvelle page si nécessaire
                doc.addPage();
                yPosition = 15;
            }
        }
    }

    // Sauvegarder le PDF
    doc.save('statistiques_ecoute.pdf');
}

// Fonction pour exporter les statistiques en image
async function exportToImage() {
    const statsSection = document.getElementById('stats');
    if (!statsSection) {
        alert("Aucune statistique à exporter.");
        return;
    }

    html2canvas(statsSection).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = 'statistiques_ecoute.png';
        link.click();
    });
}
