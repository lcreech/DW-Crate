// Constants
const clientId = 'cb3468700cfa49fda9bdd7af2319dcc5'; // Replace with your actual client ID
const redirectUri = 'https://dwcrate.netlify.app/'; // Replace with your redirect URI
const authUrl = 'https://accounts.spotify.com/authorize';
const tokenUrl = 'https://accounts.spotify.com/api/token';

// Global variables
let accessToken = '';
let allTracks = []; // To store all tracks across playlists

// DOM elements
const authButton = document.getElementById('auth-button');
const fetchPlaylistsButton = document.getElementById('fetch-dw-playlists');
const playlistsContainer = document.getElementById('playlists-container');
const createPlaylistButton = document.getElementById('create-playlist');
const authSection = document.getElementById('auth-section');
const playlistSection = document.getElementById('playlist-section');

// Function to handle the Spotify login
function loginToSpotify() {
  const scopes = 'playlist-read-private playlist-modify-public playlist-modify-private user-library-read';
  const authUrlWithParams = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;

  window.location = authUrlWithParams;
}

// Function to handle the token exchange
function exchangeCodeForToken(code) {
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('client_id', clientId);
  params.append('client_secret', 'your-client-secret'); // Replace with your client secret

  fetch(tokenUrl, {
    method: 'POST',
    body: params
  })
    .then(response => response.json())
    .then(data => {
      if (data.access_token) {
        accessToken = data.access_token;
        console.log('Access token retrieved:', accessToken);
        showAuthenticatedUI();
      } else {
        console.error('Failed to retrieve access token:', data);
      }
    })
    .catch(error => console.error('Error exchanging authorization code:', error));
}

// Function to fetch Discover Weekly playlists
function fetchDiscoverWeeklyPlaylists() {
  if (!accessToken) {
    console.error('No access token available. Please log in first.');
    return;
  }

  fetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then(response => response.json())
    .then(data => {
      console.log('Playlists fetched:', data);
      if (data.items && data.items.length > 0) {
        const dwPlaylists = data.items.filter(playlist => playlist.name.toLowerCase().includes('discover weekly'));
        displayPlaylists(dwPlaylists);
      } else {
        console.log('No Discover Weekly playlists found.');
      }
    })
    .catch(error => console.error('Error fetching playlists:', error));
}

// Function to display playlists
function displayPlaylists(playlists) {
  playlistsContainer.innerHTML = '';

  playlists.forEach(playlist => {
    const playlistDiv = document.createElement('div');
    playlistDiv.classList.add('playlist');
    playlistDiv.innerHTML = `
      <h3>${playlist.name}</h3>
      <button onclick="fetchTracks('${playlist.id}')">Fetch Tracks</button>
    `;
    playlistsContainer.appendChild(playlistDiv);
  });

  createPlaylistButton.classList.remove('hidden');
}

// Function to show authenticated UI
function showAuthenticatedUI() {
  authSection.classList.add('hidden');
  playlistSection.classList.remove('hidden');
}

// Check if the user is already logged in
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // Exchange the code for the token if there's a code in the URL
  exchangeCodeForToken(code);
}

// Event listeners
authButton.addEventListener('click', loginToSpotify);
fetchPlaylistsButton.addEventListener('click', () => {
  console.log('Fetching Discover Weekly playlists...');
  fetchDiscoverWeeklyPlaylists();
});
createPlaylistButton.addEventListener('click', () => {
  console.log('Creating aggregated playlist...');
  createAggregatedPlaylist();
});
