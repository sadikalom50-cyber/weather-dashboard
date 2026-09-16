// Configuration
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Get your free key from https://openweathermap.org/api
const BASE_URL = 'https://api.openweathermap.org';
const UNITS = 'metric'; // Celsius

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const errorMessage = document.getElementById('errorMessage');
const currentWeatherDiv = document.getElementById('currentWeather');
const forecastSection = document.getElementById('forecastSection');
const forecastContainer = document.getElementById('forecastContainer');

// Event Listeners
searchBtn.addEventListener('click', () => searchByCity());
locationBtn.addEventListener('click', () => getLocationWeather());
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchByCity();
});

// Fetch weather by city name
async function searchByCity() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    await fetchWeather(city);
}

// Fetch weather by geolocation
function getLocationWeather() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    locationBtn.textContent = '📍 Loading...';
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
            locationBtn.textContent = '📍 My Location';
        },
        (error) => {
            showError('Unable to get your location. ' + error.message);
            locationBtn.textContent = '📍 My Location';
        }
    );
}

// Fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        const weatherUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${UNITS}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${UNITS}`;
        const uvUrl = `${BASE_URL}/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

        const [weatherRes, forecastRes, uvRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl),
            fetch(uvUrl)
        ]);

        if (!weatherRes.ok) throw new Error('Weather data not found');

        const weather = await weatherRes.json();
        const forecast = await forecastRes.json();
        const uv = await uvRes.json();

        displayCurrentWeather(weather, uv);
        displayForecast(forecast);
        hideError();
        updateBackgroundTheme(weather.weather[0].main);
    } catch (error) {
        showError('Error fetching weather data: ' + error.message);
    }
}

// Fetch weather by city
async function fetchWeather(city) {
    try {
        const geoUrl = `${BASE_URL}/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
        const geoRes = await fetch(geoUrl);

        if (!geoRes.ok) throw new Error('City not found');

        const geoData = await geoRes.json();
        if (geoData.length === 0) throw new Error('City not found');

        const { lat, lon } = geoData[0];
        await fetchWeatherByCoords(lat, lon);
    } catch (error) {
        showError('Error fetching weather data: ' + error.message);
    }
}

// Display current weather
function displayCurrentWeather(weather, uv) {
    const { name, sys, main, weather: weatherData, wind, clouds, visibility } = weather;
    const { country } = sys;
    const { description, icon } = weatherData[0];

    document.getElementById('cityName').textContent = `${name}, ${country}`;
    document.getElementById('weatherDescription').textContent = description;
    document.getElementById('temperature').textContent = `${Math.round(main.temp)}°`;
    document.getElementById('feelsLike').textContent = `${Math.round(main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${wind.speed} m/s`;
    document.getElementById('pressure').textContent = `${main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} km`;
    document.getElementById('uvIndex').textContent = uv.value ? Math.round(uv.value * 10) / 10 : 'N/A';

    // Set weather icon
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    document.getElementById('weatherIcon').src = iconUrl;

    currentWeatherDiv.classList.remove('hidden');
}

// Display 5-day forecast
function displayForecast(forecast) {
    // Group forecast data by day (one entry per day at noon)
    const dailyForecasts = {};

    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        if (!dailyForecasts[day]) {
            dailyForecasts[day] = {
                date: day,
                temps: [],
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                dt: item.dt
            };
        }
        dailyForecasts[day].temps.push(item.main.temp);
    });

    forecastContainer.innerHTML = '';

    Object.values(dailyForecasts).slice(0, 5).forEach(day => {
        const maxTemp = Math.round(Math.max(...day.temps));
        const minTemp = Math.round(Math.min(...day.temps));
        const iconUrl = `https://openweathermap.org/img/wn/${day.icon}@2x.png`;

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="date">${day.date}</div>
            <img src="${iconUrl}" alt="Weather icon" class="icon">
            <div class="description">${day.description}</div>
            <div class="temps">
                <span class="max-temp">${maxTemp}°</span>
                <span class="min-temp">${minTemp}°</span>
            </div>
        `;
        forecastContainer.appendChild(card);
    });

    forecastSection.classList.remove('hidden');
}

// Update background theme based on weather
function updateBackgroundTheme(weather) {
    document.body.classList.remove('clear-sky', 'cloudy', 'rainy', 'snowy');

    if (weather.includes('Clear') || weather.includes('Sunny')) {
        document.body.classList.add('clear-sky');
    } else if (weather.includes('Cloud')) {
        document.body.classList.add('cloudy');
    } else if (weather.includes('Rain') || weather.includes('Drizzle')) {
        document.body.classList.add('rainy');
    } else if (weather.includes('Snow')) {
        document.body.classList.add('snowy');
    }
}

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    currentWeatherDiv.classList.add('hidden');
    forecastSection.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.remove('show');
}

// Initialize with default city
window.addEventListener('load', () => {
    if (API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
        showError('⚠️ Please add your OpenWeatherMap API key in script.js (line 6)');
    } else {
        fetchWeather('London');
    }
});
