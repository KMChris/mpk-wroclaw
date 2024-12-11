import '@material/web/progress/circular-progress.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/text-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';

let vehicles = [];

const fetchData = async (filter) => {
  filter = filter ? `?filters={"Nazwa_Linii":"${filter}"}` : '';
  const url = 'api' + filter;
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
        resultContainer.innerHTML = 'Wystąpił błąd podczas pobierania danych.';
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
