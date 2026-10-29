(() => {
  const list = document.querySelector("#profileList");
  const form = document.querySelector("#createProfileForm");
  const name = document.querySelector("#newProfileName");
  const create = document.querySelector("#createProfileButton");
  const status = document.querySelector("#authStatus");

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `form-status ${kind}`;
  }

  async function selectProfile(id, button) {
    button.disabled = true;
    setStatus("Opening local profile…");
    try {
      await window.MuscleRecoveryApi.selectProfile(id);
      window.location.assign("index.html");
    } catch (error) {
      button.disabled = false;
      setStatus(error.message || "Unable to open this local profile.", "error");
    }
  }

  async function load() {
    try {
      const profiles = await window.MuscleRecoveryApi.getProfiles();
      list.innerHTML = "";
      if (!profiles.length) {
        list.innerHTML = '<p class="empty-state">Create a local profile to get started.</p>';
        return;
      }
      profiles.forEach((profile) => {
        const button = document.createElement("button");
        button.className = "button button-secondary";
        button.type = "button";
        button.textContent = profile.displayName;
        button.addEventListener("click", () => selectProfile(profile.id, button));
        list.append(button);
      });
    } catch (error) {
      setStatus(error.message || "Unable to load local profiles.", "error");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    create.disabled = true;
    setStatus("Creating local profile…");
    try {
      await window.MuscleRecoveryApi.createProfile(name.value);
      window.location.assign("index.html");
    } catch (error) {
      create.disabled = false;
      setStatus(error.message || "Unable to create this local profile.", "error");
    }
  });

  load();
})();
