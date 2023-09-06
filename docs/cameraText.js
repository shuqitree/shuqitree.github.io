// Declare an array of camera names
let cameraArray = ["Fujifilm X-T3", "Nikon Z6", "Sony A7 IV", "Fujifilm X-T4"];

// Index to track the current camera name from the cameraArray
let index = 0;

// The base text that remains constant
let baseText = 'All photographs are taken with my ';

// Variable to hold the current camera name being displayed
let currentCamera = "";

// The full text to be displayed, initially just the base text
let fullText = baseText + currentCamera;

// Direction of the text change ('forward' for writing and 'backward' for erasing)
let direction = "forward";

// Function to update the dynamic text
function updateText() {
  // Get the HTML element where the text will be displayed
  let element = document.getElementById("dynamicText");

  // Update 'currentCamera' based on the direction
  if (direction === "forward") {
    // Take a substring of the next camera name, one character longer than the current display
    currentCamera = cameraArray[index].substr(0, currentCamera.length + 1);
  } else {
    // Remove the last character from the currentCamera
    currentCamera = currentCamera.substr(0, currentCamera.length - 1);
  }

  // Concatenate base text and currentCamera, apply strong and em tags for bold and italic
  fullText = baseText + '<strong><em>' + currentCamera + '</em></strong>';

  // Update the HTML element's content
  element.innerHTML = fullText + '<span id="cursor"></span>';

  // Logic to decide the next action
  if (currentCamera === cameraArray[index] && direction === "forward") {
    // If the full name is displayed, start erasing after 2 seconds
    direction = "backward";
    setTimeout(updateText, 2000);
  } else if (currentCamera === "" && direction === "backward") {
    // If erased, start writing the next name after 0.5 second
    direction = "forward";
    index = (index + 1) % cameraArray.length;
    setTimeout(updateText, 500);
  } else {
    // In all other cases, update after 0.15 second
    setTimeout(updateText, 150);
  }
}

// Call the function initially to start the text updates
updateText();