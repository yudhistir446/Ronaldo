// Handle media upload form submission
const uploadForm = document.getElementById('uploadForm');
uploadForm.addEventListener('submit', function(event) {
  event.preventDefault();

  const formData = new FormData(uploadForm);
  fetch('/upload', {
    method: 'POST',
    body: formData,
  })
  .then(response => response.text())
  .then(data => {
    document.getElementById('uploadFeedback').innerText = 'File uploaded successfully!';
    fetchMedia(); // Refresh the media gallery
  })
  .catch(error => {
    console.error('Error uploading file:', error);
    document.getElementById('uploadFeedback').innerText = 'Error uploading file.';
  });
});

// Fetch the media gallery and display it
function fetchMedia() {
  fetch('/media')
    .then(response => response.json())
    .then(data => {
      const gallery = document.getElementById('mediaGallery');
      gallery.innerHTML = ''; // Clear the gallery before adding new images
      data.forEach(media => {
        const mediaElement = document.createElement('div');
        mediaElement.classList.add('gallery-item');
        const mediaImage = document.createElement('img');
        mediaImage.src = media.url;
        mediaImage.alt = media.name;
        mediaElement.appendChild(mediaImage);
        gallery.appendChild(mediaElement);
      });
    })
    .catch(error => {
      console.error('Error fetching media:', error);
    });
}

// Call fetchMedia on page load to display existing media
window.onload = fetchMedia;
