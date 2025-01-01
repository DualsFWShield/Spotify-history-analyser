// Initialisation du DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    initializeEventListeners();
});

/**
 * Initialisation des graphiques avec Chart.js
 */
function initializeCharts() {
    const listeningTimeCtx = document.getElementById('listeningTimeChart').getContext('2d');
    const genreCtx = document.getElementById('genreChart').getContext('2d');

    // Graphique d'écoute par mois
    new Chart(listeningTimeCtx, {
        type: 'line',
        data: {
            labels: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
            datasets: [{
                label: 'Heures d\'écoute',
                data: [12, 15, 20, 25, 30, 35, 40, 37, 30, 28, 24, 20],
                borderColor: '#1db954',
                backgroundColor: 'rgba(29, 185, 84, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#fff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#fff' }
                },
                y: {
                    ticks: { color: '#fff' }
                }
            }
        }
    });

    // Graphique des genres musicaux
    new Chart(genreCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pop', 'Rock', 'Rap', 'Classique', 'Lo-fi'],
            datasets: [{
                label: 'Genres musicaux',
                data: [40, 30, 20, 5, 5],
                backgroundColor: ['#1db954', '#e74c3c', '#f39c12', '#9b59b6', '#3498db']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#fff'
                    }
                }
            }
        }
    });
}

/**
 * Initialisation des événements
 */
function initializeEventListeners() {
    // Boutons d'exportation
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('exportJsonBtn').addEventListener('click', exportToJSON);
    document.getElementById('exportImageBtn').addEventListener('click', exportToImage);

    // Upload de fichiers
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Partage sur les réseaux sociaux
    if (navigator.share) {
        const shareBtn = document.getElementById('shareBtn');
        shareBtn.style.display = 'block';
        shareBtn.addEventListener('click', shareData);
    }
}

/**
 * Exporter les statistiques en PDF
 */
function exportToPDF() {
    const element = document.getElementById('statsContainer');
    html2pdf().set({
        margin: 1,
        filename: 'Statistiques.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
}

/**
 * Exporter les statistiques en image
 */
function exportToImage() {
    const element = document.getElementById('statsContainer');
    html2canvas(element).then((canvas) => {
        const link = document.createElement('a');
        link.download = 'Statistiques.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}

/**
 * Exporter les statistiques en JSON
 */
function exportToJSON() {
    const stats = {
        listeningTime: [12, 15, 20, 25, 30, 35, 40, 37, 30, 28, 24, 20],
        favoriteGenres: ['Pop', 'Rock', 'Rap', 'Classique', 'Lo-fi'],
        favoriteSongs: [
            { title: 'Blinding Lights', artist: 'The Weeknd' },
            { title: 'Someone Like You', artist: 'Adele' },
            { title: 'Bohemian Rhapsody', artist: 'Queen' }
        ]
    };

    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Statistiques.json';
    link.click();
}

/**
 * Gestion de l'upload de fichiers JSON
 */
function handleFileUpload(event) {
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                updateStats(data);
            } catch (error) {
                alert('Erreur : fichier JSON invalide.');
            }
        };
        reader.readAsText(file);
    }
}

/**
 * Mise à jour des statistiques avec les données importées
 */
function updateStats(data) {
    const favoritesList = document.getElementById('favorites');
    favoritesList.innerHTML = '';

    data.favoriteSongs.forEach((song) => {
        const li = document.createElement('li');
        li.textContent = `${song.title} - ${song.artist}`;
        favoritesList.appendChild(li);
    });
}

/**
 * Partager les statistiques via l'API Web Share
 */
function shareData() {
    const shareData = {
        title: 'Mes Statistiques Musicales',
        text: 'Découvrez mes statistiques musicales !',
        url: window.location.href
    };

    navigator.share(shareData).catch((error) => {
        console.error('Erreur lors du partage :', error);
    });
}