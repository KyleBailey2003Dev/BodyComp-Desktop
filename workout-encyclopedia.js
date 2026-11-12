(() => {
  const exerciseData = {
    overheadPressButton: {
      name: "Overhead Press",
      description:
        "Press a barbell or dumbbells straight overhead from your shoulder.",
      image: "assets/Gifs/Dumbbell-Shoulder-Press.gif",
    },
    lateralRaiseButton: {
      name: "Lateral Raise",
      description:
        "Grab two dumbbells in each hand and raise your arms out straight and to the sides.",
      image: "assets/Gifs/Dumbbell-Lateral-Raise.gif",
    },
    rearDeltFly: {
      name: "Rear Delt Fly",
      description:
        "A reversed version of the Pec Fly machine that involves using the Rear Deltoid Muscles.",
      image: "assets/Gifs/reverse-machine-fly.webp",
    },
    frontRaise: {
      name: "Front Raise",
      description:
        "Grab two dumbbells in each hand and bring them to shoulder level while keeping your arms straight in front of you.",
      image: "assets/Gifs/Dumbbell-Front-Raise-GIF.gif",
    },
    arnoldPress: {
      name: "Arnold Press",
      description:
        "Invented by legendary bodybuilder Arnold Schwarzenegger, this exercise involves a traditional overhead press while rotating the wrists.",
      image: "assets/Gifs/arnold-press.gif",
    },
    shrugs: {
      name: "Shrugs",
      description:
        "Grab two dumbbells in each hand and keep your arms by your side while shrugging your shoulders up. This workout primary targets the Trapezius.",
      image: "assets/Gifs/shrugs.webp",
    },
  };

  const exerciseButtons = document.querySelectorAll(".exercise-toggle-button");
  const modal = document.getElementById("exerciseModal"); // Matches HTML id="exerciseModal"
  const exerciseDetails = document.getElementById("exercise-details");
  const closeButton = document.getElementById("close-button");

  function openExerciseDetails(exercise) {
    if (!exercise) return;

    exerciseDetails.innerHTML = `
      <h2>${exercise.name}</h2>
      <p>${exercise.description}</p>
      <img src="${exercise.image}" alt="${exercise.name}" style="max-width: 100%; height: auto;" />
    `;
    modal.showModal();
  }

  exerciseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedExercise = exerciseData[button.id];
      openExerciseDetails(selectedExercise);
    });
  });

  closeButton.addEventListener("click", () => {
    modal.close();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.close();
    }
  });
})();
