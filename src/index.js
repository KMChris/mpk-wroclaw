import '@material/web/progress/circular-progress.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/text-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import '@material/web/fab/fab.js';

let vehicles = [];
const map = L.map('map').setView([51.11, 17.04], 13);
const style = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark_all' : 'light_all';
L.tileLayer('https://{s}.basemaps.cartocdn.com/' + style + '/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 20,
  minZoom: 3
}).addTo(map);

const locationIcon = L.divIcon({
  className: '',
  html: `<div class="location-marker">
           <div class="pulsating-circle"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const trams = ['0', '2', '3', '4', '5', '6', '7', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '78']
const buses = ['A', 'D', 'K', 'N', 'P', '100', '101', '102', '103', '104', '105', '106', '107', '110', '111', '112', '113', '114', '115', '116',
               '118', '119', '120', '121', '122', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '136', '142',
               '143', '144', '145', '146', '147', '148', '149', '150', '151', '152', '206', '240', '241', '242', '243', '244', '245', '246',
               '247', '248', '249', '250', '251', '253', '255', '257', '259', '310', '315', '319', '602', '607']

const icon = (linia) => L.divIcon({
  className: '',
  html: trams.includes(linia) ? `<div class="map-icon tram">${linia}</div>` : `<div class="map-icon bus">${linia}</div>`,
  iconSize: [40, 20],
  iconAnchor: [20, 10],
  tooltipAnchor: [0, -10]
});

const locationMarker = L.marker([0, 0], {icon: locationIcon});
locationMarker.setZIndexOffset(1000);
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async (position) => {
    if (!map.hasLayer(locationMarker))
      locationMarker.addTo(map);
    locationMarker.setLatLng([position.coords.latitude, position.coords.longitude]);
    map.setView([position.coords.latitude, position.coords.longitude], 16);
  });
}
const group = new L.featureGroup().addTo(map);
const showMarkers = async (vehicles, userLocation) => {
  group.clearLayers();
  if (!map.hasLayer(locationMarker))
    locationMarker.addTo(map);
  locationMarker.setLatLng([userLocation.latitude, userLocation.longitude]);
  vehicles.map(vehicle => L.marker([
    vehicle.Ostatnia_Pozycja_Szerokosc,
    vehicle.Ostatnia_Pozycja_Dlugosc
  ], {icon: icon(vehicle.Nazwa_Linii)})
  .bindTooltip(`Pojazd nr ${vehicle.Nr_Boczny}<br>widziano ${formatTime(vehicle.Data_Aktualizacji)}`, {
    opacity: 1,
    direction: 'top'
  }).addTo(group));
  map.fitBounds(group.getBounds());
};

const showMapButton = document.getElementById('showMap');
const container = document.getElementsByClassName('container')[0];
let isHidden = false;
showMapButton.addEventListener('click', () => {
  if (isHidden) {
    container.classList.remove('hidden');
    container.classList.add('visible');
  } else {
    container.classList.remove('visible');
    container.classList.add('hidden');
  }
  isHidden = !isHidden;
});

const fetchData = async (filter) => {
  filter = filter ? `?filters={"Nazwa_Linii":"${filter}"}` : '';
  const url = process.env.NODE_ENV === 'production' ? 'api' + filter : 'http://127.0.0.1:5000/mpk/api' + filter;
  const res = await fetch(url);
  vehicles = await res.json();
};

const findNearestVehicle = (userLocation) => {
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 12742 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  vehicles = vehicles.filter(vehicle =>
    trams.includes(vehicle.Nazwa_Linii) || buses.includes(vehicle.Nazwa_Linii)
  );
  showMarkers(vehicles, userLocation);

  return vehicles.map(vehicle => ({
      ...vehicle,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        vehicle.Ostatnia_Pozycja_Szerokosc,
        vehicle.Ostatnia_Pozycja_Dlugosc
      )
    })).reduce((nearest, vehicle) => 
      vehicle.distance < nearest.distance ? vehicle : nearest
    );
};
 
const button = document.getElementById('findButton');
button.addEventListener('click', async () => {
  if (navigator.geolocation) {
    button.disabled = true;
    button.innerHTML = `<md-circular-progress indeterminate></md-circular-progress>`;
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await fetchData(document.getElementById('line').value);
        displayResult(findNearestVehicle({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
      } catch (error) {
        console.error('Error fetching data:', error);
        const resultContainer = document.getElementById('result');
        resultContainer.innerHTML = '<br>Wystąpił błąd podczas pobierania danych.';
      } finally {
        button.innerHTML = 'Znajdź najbliższy pojazd';
        button.disabled = false;
      }
    }, async (error) => {
      console.error('Error getting location:', error);
      const dialog = document.getElementById('dialog');
      dialog.style.display = 'contents';
      dialog.show();
      button.innerHTML = 'Znajdź najbliższy pojazd';
      button.disabled = false;
    }, {enableHighAccuracy: true});
  } else {
    alert('Geolokalizacja nie jest wspierana przez tę przeglądarkę.');
  }
});
const textField = document.getElementById('line');
textField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    button.click();
  }
});
button.click();

function formatTime(dateString) {
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);

  const intervals = [
    {label: 'd', seconds: 86400},
    {label: 'h', seconds: 3600},
    {label: 'min', seconds: 60},
    {label: 's', seconds: 1}
  ];

  for (const interval of intervals) {
    const count = Math.floor(diff / interval.seconds);
    if (count > 0)
      return `${count}${interval.label} temu`;
  }
  return 'przed chwilą';
}


const displayResult = (vehicle) => {
  const resultContainer = document.getElementById('result');
  resultContainer.innerHTML = `
    <div class="vehicle-row">
      <span class="label">Numer boczny:</span>
      <span class="value highlight">${vehicle.Nr_Boczny}</span>
    </div>
    <div class="vehicle-row">
      <span class="label">Numer linii:</span>
      <span class="value">${vehicle.Nazwa_Linii}</span>
    </div>
    ${vehicle.Nr_Rej !== 'None' ? `
    <div class="vehicle-row">
      <span class="label">Numer rejestracyjny:</span>
      <span class="value">${vehicle.Nr_Rej}</span>
    </div>
    ` : ''}
    <div class="vehicle-row">
      <span class="label">Brygada:</span>
      <span class="value">${vehicle.Brygada}</span>
    </div>
    <div class="vehicle-row">
      <span class="label">Odległość:</span>
      <span class="value">${vehicle.distance.toFixed(2)} km</span>
    </div>
    <div class="vehicle-row">
      <span class="label">Zaktualizowano:</span>
      <span class="value">${formatTime(vehicle.Data_Aktualizacji)}</span>
    </div>
  `;
};
