"use strict";


function setupVideo() 
{
	document.querySelector('.configurevideo').style.display = 'block';
	// Do an initial query of possible video sources so as to trigger
	// the web browser to ask the user to provide webcam permission to
	// the web page
	navigator.mediaDevices?.getUserMedia({ video: true }).then((stream) => {
		// We don't actually want to play the video stream since 
		// we only did this to get the webcam permission, so stop all streams
		stream.getTracks().forEach(track => {
			track.stop();
		});
		document.querySelector('.configurevideo .enableWebcamPermission').style.display = 'none';
		document.querySelector('.configurevideo .chooseCamera').style.display = 'block';
		
		// Now enumerate the available video feeds
		return navigator.mediaDevices.enumerateDevices();
	}).then((devices) => {
		// Listen for changes in the selected camera, and show the
		// video feed from that camera
		document.querySelector('.configurevideo .chooseCamera select').onchange = (evt) => {
			let deviceId = evt.target.value;
			cameraSelected(deviceId);
		};
		
		// Set the list of webcam entries
		for (let device of devices) {
			if (device.kind != 'videoinput') continue;
			let option = document.createElement('option');
			option.text = device.label || 'Camera';
			option.value = device.deviceId;
			document.querySelector('.configurevideo .chooseCamera select').appendChild(option);
		}
		
		// Select the first camera
		cameraSelected(document.querySelector('.configurevideo .chooseCamera select').value);
	});

	let currentStream = null;
	let currentDeviceId = null;
	// User has chosen a webcam from the dropdown list
	function cameraSelected(deviceId)
	{
		// Disable current stream in the preview window
		if (currentStream != null)
		{
			currentStream.getTracks().forEach(track => {
				track.stop();
			});
			currentStream = null;
		}
		
		// Grab the video feed from the selected webcam and show a preview of it
		currentDeviceId = deviceId;
		let constraints = {
			video: {
				deviceId: {exact: deviceId},
				width: {exact: 640},
				height: {exact: 360}
			}
		};
		navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
			currentStream = stream;
			document.querySelector('.configurevideo video').srcObject = stream;
		});
		
		// If a valid webcam is selected, we can show the button to proceed
		document.querySelector('.configurevideo .go').style.visibility = 'visible';
	}
	
	// Hook the 'go' button that can be clicked when the user has successfully
	// chosen a webcam feed
	document.querySelector('.configurevideo .go a').addEventListener('click', (e) => {
		e.preventDefault();
		// Stop the webcam preview video
		currentStream.getTracks().forEach(track => {
			track.stop();
		});
		document.querySelector('.configurevideo video').srcObject = null;
		// hide the current webcam selector
		document.querySelector('.configurevideo').style.display = 'none';
		// start the game
		startGame(currentDeviceId);
	});
	
}


