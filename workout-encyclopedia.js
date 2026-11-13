(() => {
  const exerciseData = {
    benchPress: {
      name: "Bench Press",
      description:
        "Grab a barbell or two dumbbells, lay flat on a bench, and press them up from your chest to the top.",
      image: "assets/Gifs/Dumbbell-Chest-Press.gif",
    },
    inclineBenchPress: {
      name: "Incline Bench Press",
      description:
        "Set the bench to a 45 degree incline and bench from there to target the upper pectorals more.",
      image: "assets/Gifs/Dumbbell-Incline-Press.gif",
    },
    declineBenchPress: {
      name: "Decline Bench Press",
      description:
        "Set the bench to a slight decline and bench from there to target the lower pectorals more.",
      image: "assets/Gifs/declinebench.gif",
    },
    pecFly: {
      name: "Pec Fly",
      description:
        "On the Pec Fly machine, grab the two handles and pull them together while keeping your arms straight and at chest level.",
      image: "assets/Gifs/machine-chest-fly.webp",
    },
    dips: {
      name: "Chest Dips",
      description:
        "Grab the two handles of a dip station and dip your body down until your chest reaches your hands.",
      image: "assets/Gifs/Dips.gif",
    },
    cableCrossover: {
      name: "Cable Crossover",
      description:
        "Grab the ends of two cable machines and pull them down together to your lower chest.",
      image: "assets/Gifs/Decline-Fly-Mistake-leaning-forward.webp",
    },
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
    frontRaiseButton: {
      name: "Front Raise",
      description:
        "Grab two dumbbells in each hand and bring them to shoulder level while keeping your arms straight in front of you.",
      image: "assets/Gifs/Dumbbell-Front-Raise-GIF.gif",
    },
    arnoldPressButton: {
      name: "Arnold Press",
      description:
        "Invented by legendary bodybuilder Arnold Schwarzenegger, this exercise involves a traditional overhead press while rotating the wrists.",
      image: "assets/Gifs/arnold-press.gif",
    },
    shrugsButton: {
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
