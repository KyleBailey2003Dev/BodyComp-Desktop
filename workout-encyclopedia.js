(() => {
  const exerciseData = {
    overheadPressButton: {
      name: "Overhead Press",
      description:
        "Press a barbell or dumbbells straight overhead from your shoulder",
      image: "assets\Gifs\Dumbbell-Shoulder-Press.gif",
    },
  };

  const exerciseButtons = document.querySelectorAll(".exercise-toggle-button");
  const modal = document.getElementById("exercise-modal");
  const exerciseDetails = document.getElementById("exercise-details");
  const closeButton = document.getElementById("close-button");

  function openExerciseDetails(exercise) {
    if (!exercise) return;

    exerciseDetails.innerHTML = `
    <h2>${exercise.name}</h2>
    <p>${exercise.description}</p>
        <img src ="${exercise.image}" alt="${exercise.name}" style="max-width: 100%
        `;
  }
})();
