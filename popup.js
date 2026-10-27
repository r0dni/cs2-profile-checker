document.addEventListener('DOMContentLoaded', () => {
  const checkBtn = document.getElementById('checkBtn');
  const profileInput = document.getElementById('profileInput');
  const resultContainer = document.getElementById('resultContainer');

  checkBtn.addEventListener('click', () => {
    const query = profileInput.value.trim();
    if (!query) {
      alert('Please enter a valid Steam ID or Profile URL.');
      return;
    }
    
    // Placeholder for future logic
    console.log('Checking profile for:', query);
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = `<p>Searching for profile: <strong>${query}</strong>...</p>`;
  });
});
