// Constants
const clientId = 'cb3468700cfa49fda9bdd7af2319dcc5'; // Replace with your actual client ID
const redirectUri = 'https://dwcrate.netlify.app/'; // Ensure this matches your Spotify app settings
const authUrl = 'https://accounts.spotify.com/authorize';

// Global variables
let accessToken = '';

// DOM elements
const authButton = document.getElementById('auth-button');
const fetchPlaylistsButton = document.getElementById('fetch-dw-playlists');
const playlistsContainer = document.getElementById('playlists-container');
const authSection = document.getElementById('auth-section');
const playlistSection = document.getElementById('playlist-section');

// Function to handle Spotify login
function loginToSpotify() {
  console.log('Login button clicked');
  const scopes = 'playlist-read-private';
  const authUrlWithParams = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}`;
  console.log('Redirecting to:', authUrlWithParams);
  window.location = authUrlWithParams;
}

// Extract access token from URL hash
function getAccessTokenFromUrl() {
  console.log('Checking URL for access token...');
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const token = hashParams.get('access_token');
  if (token) {
    console.log('Access token found:', token);
  } else {
    console.error('No access token found in URL');
  }
  return token;
}

// Function to fetch playlists
function fetchPlaylists() {
  if (!accessToken) {
    console.error('No access token available. Please log in first.');
    return;
  }

  fetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then(response => {
      if (!response.ok) {
        console.error('Failed to fetch playlists:', response.statusText);
        throw new Error('Failed to fetch playlists');
      }
      return response.json();
    })
    .then(data => {
      console.log('Playlists fetched:', data);
      displayPlaylists(data.items || []);
    })
    .catch(error => console.error('Error fetching playlists:', error));
}

// Function to display playlists
function displayPlaylists(playlists) {
  playlistsContainer.innerHTML = '';
  playlists.forEach(playlist => {
    const playlistDiv = document.createElement('div');
    playlistDiv.classList.add('playlist');
    playlistDiv.innerHTML = `<h3>${playlist.name}</h3>`;
    playlistsContainer.appendChild(playlistDiv);
  });
}

// Show authenticated UI
function showAuthenticatedUI() {
  authSection.classList.add('hidden');
  playlistSection.classList.remove('hidden');
  console.log('Switched to authenticated UI');
}

// Check if user is logged in
accessToken = getAccessTokenFromUrl();
if (accessToken) {
  console.log('Access token retrieved:', accessToken);
  showAuthenticatedUI();
}

// Event listeners
authButton.addEventListener('click', loginToSpotify);
fetchPlaylistsButton.addEventListener('click', fetchPlaylists);
