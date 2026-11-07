(() => {
    const muscleGroupButtons = document.querySelectorAll('.muscle-group-button');
    const exerciseList = document.getElementById('exercise-list');
    const openButton = document.getElementById('muscle-group-button');
    const closeButton = document.getElementById('close-button');

    openButton.addEventListener('click', () => {
        exerciseList.classList.toggle('hidden');
    });

    closeButton.addEventListener('click', () => {
        exerciseList.classList.add('hidden');
    });
})();