(() => {
    const muscleGroupButtons = document.querySelectorAll('.muscle-group-button');
    const exerciseList = document.getElementById('exercise-list');

    muscleGroupButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const muscleGroup = button.getAttribute('data-muscle-group');
            const exercises = await fetchExercisesByMuscleGroup(muscleGroup);
            displayExercises(exercises);

        });
    });

    function displayExercises(exercises) {
        muscleGroupButtons.forEach(button => button.classList.remove('active'));
        const activeButton = Array.from(muscleGroupButtons).find(button => button.getAttribute('data-muscle-group') === exercises[0]?.muscle_group);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    

})();