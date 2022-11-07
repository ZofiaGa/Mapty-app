'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // for this code we create our own id with the Date.now() (NOT new Date() - this generates something we can't use for this purpose)
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // array --> [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  /*
  Notes to the _setDescription() method: 
    - creating in the Workout class, but
    - not calling in the Workout class. Workout class doesn't have the 'type' variable.
    - calling it in the Running and Cycling class --> there is the 'type' variable that is used in this method
  */

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running'; // creating this field in order to use it in the marker -- this could be defined also in the cosntructor below as 'this.type' but we create this outside (and before) the constructor
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace(); // we can call methods in the constructor (Side Note: in other programming languages it is not adivsed to call method from the constructor)
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling'; // creating this field in order to use it in the marker -- this could be defined also in the cosntructor below as 'this.type'
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = cycling
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60); // need to divide by 60  in order to convert to hours
    return this.speed;
  }
}

// ONLY FOR TEST
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//////////////////////////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // class fields
  // creating private instance properties - properties that are going to be present on all the instances of this class
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // GET USER'S POSITION
    // method that is called as soon as the page loads (Note: anything called in the constructor is going to be called as soon as the page loads. And is going to be available to use)
    this._getPosition(); // calling the geo location API

    // GET DATA FROM LOCAL STORAGE
    this._getLocalStorage();

    // ATTACH EVENT HANDLERS
    // we put the form related events and functions in the constructor so it is called as soon as the page loads - however the form will be visible once the user performs action to load
    form.addEventListener('submit', this._newWorkout.bind(this));
    /*
    If we would use the 'this._newWorkout' method only, the 'this' keyword would point to the form object and not to the App object -->
    --> we add the bind() method and add the 'this' keyword in the bind() method --> going to point now to the App object
    */

    inputType.addEventListener('change', this._toggleElevationField);
    /* 
    Here we don't need to add the bind() method with the 'this' keyword because it is not used anywhere.
    In the _toggleElevationField() method below there are no App class related variables called like #map, or #mapEvent -> that is why no bind method is needed here. We just simply call the content of the _toggleElevationField() method that is present in the App class (the this before the _toggleElevationField() method is refering to the object that is an instance of the App class)
    */
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    /*
    Here we need to add the bind(this) - in the _moveToPopup() method (somewhere below) we use the #workouts and #map property from the App class
    */
  }
  // the Load event (page load) triggers the constructor,
  // this constructor triggers the _getPosition() method
  // the _getPosition() triggers the _loadMap() method

  _getPosition() {
    if (navigator.geolocation)
      // test for old browsers, check if the location exists
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          /* 
    If we would use 'this._loadMap()' it would be treated as a regular function call not as a method call.
    The 'this._loadMap()' is a callback function - we don't call it by ourself, it is called by the getCurrentPosition() function that will call this callback function once that it gets the current position.
    If we call 'this._loadMap()' as a regular function -> the 'this' keyword (later in the code when called) will return 'undefined'. To avoid this we use the bind() method -> we manually bind the 'this' keyword 
    bind() - returns a new function -> the 'this' keyword in the bind() method (bind(this)) --> will point to the current object
    */
          alert('Could not get your position');
        }
      );
    /* 
      Geolocation is an API
      - the 'navigator.geolocation.getCurrentPosition()' function takes two callback functions
      - 1. callback function - called on success
      - 2. callback function - called when there is an error 

      The 1st callback function - call with the 'position' parameter
     */
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // console.log(position);
    // console.log(latitude, longitude);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    /*
    - in the 'const map' in the L.map() function there should an HTML element ID that is in our HTML
    - in HTML we have the element <div id="map"></div> and that is why we use L.map('map') in our code
    - L - is a name space and it has a couple of methods that we can use
    - L - global variable - we can access from all the other scripts
    */

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    /*
    We create the 'map' variable in order to add later an event listener to it - 'map.on('click', ...)
    */

    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    /*
      For more tileLayer themes go to - https://leaflet-extras.github.io/leaflet-providers/preview/
    */

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    /*
      We put the L.popup() inside the bindPopup() - the L.popup() is the content of the bindPopup().
      In the L.popup() we set autoClose and closeOnClick to 'false' so the popup doesn't close when clicking somewhere else.
      We can also add className in order to style our popup.
      In order to add content in the popup --> we add the setPopupContent method after the bindPopup()
      
    */

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;

    /* 
        why to use mapEvent here? --> ANSWER: it is not used here but it is used in the form.addEventListener() function --> that is why we needed to set in the very beginning the mapEvent as a global variable 
      */
    /*
        The 'on()' is the event listener in the LeafLet library 
      */
    form.classList.remove('hidden');

    inputDistance.focus(); /* the focus() method is going to add cursor to the inputDistance field when the form pops up*/
  }

  _hideForm() {
    // Empty inputs

    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000); // the display property was set to 'none', we need to add back the 'grid' display property in order to be able to call the form again after clicing on the map again
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    /* 
  the closest() method is going to search the 'form__row' class name in the parent elemnents, NOT the child and/or sibling elements 
  */
    /*
  With the toggle() method we make sure that the 'inputElevation' or the 'inputCadence' is hidden. This means that only 'inputElevation' or 'inputCadence' field is going to be active.
  */
  }
  // submitting a form will create a new workout:
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    // rest parameter: The rest parameter syntax (...) allows a function to accept an indefinite number of arguments as an array
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters
    // The every() method tests whether all elements in the array pass the test implemented by the provided function. It returns a Boolean value.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
    // Number.isFinite() - determines whether the passed value is a finite number
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite

    // an other helper function:
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault(); /* e.preventDefault() - used in order to not reload the page when submitting the form */

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // inputDistance is a string that needs to be converted to number --> this is done by adding the '+' operator before the inputDistance variable
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value; // cadence parameter is only in the running workout

      // Check if data is valid --> check if data is a positive number - use of guard clause: check for the opposite of what we are originally interested in. If opposite true -> return function
      if (
        // BEFORE SIMPLIFICATION:
        // !Number.isFinite(distance) ||
        // !Number.isFinite(distance) ||
        // !Number.isFinite(distance)

        // AFTER SIMPLIFICATION
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      // Side Note: the GUARD CLAUSE - trend in modern JS

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value; // elevation parameter is only in the cycling workout
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration) // not checking if the elevation can be negative (like we did for the running) --> elevation can be negative #
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Note: according to the course the if-else is not used as much and rather if-if statements are used. Reason: cleaner code

    // Add new object to workout array
    this.#workouts.push(workout); // with this we push (add) the new 'workout' to the '#workouts' array that is defined in the beginning of the App class

    // console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide from + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map) // no bind() method neded - the this keyword in this method will still be the current object
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>  
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li> 
        `;

    // toFixed(1) - round to one decimal place

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    // here we are going to need the event (e) because now we will have to match the object or actually the element that we're actually looking for.
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // setView() is a leaflet method
  }

  _setLocalStorage() {
    // this doesn't need any parameter --> we simply get the workouts from the workout property
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  /*
  localStorage 
    - is an API that the browser provides us to use
    - the first argument - 'workouts' - in the setItem() method is the item name (or a key), the second argument  have to be a string (and will be associated with the 'workouts' key) that we want to store --> we convert to string with the 'JSON.stringify'
    - local storage - key value store
    Warning - local storage is a very simple API --> use only for small amounts of data (reason: it is blocking)
    DON'T use local storage for large amount of data (otherwise slows down the application)
    */

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return; // guard clause --> if no data then return

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      //  we do not render the workout markers here because when you first load the page there is no data, there is no marker present (it is added by the user after the page load)
      // the markers will be rendered in the _loadMap() method where the markers can be already accessible
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  // reset() - public method - accessible from the console - CHALLENGE: create a button that will use this method to remove all the logged workouts

  /*
    In the setLocaltorage we use JSON.stringify() to convert to string
    in the getLocalStorage we use JSON.parse() in order to convert back to an object
    */
}

const app = new App(); // calling the App class

// console.log(app);

/* 
CDN - content delivery network
*/
