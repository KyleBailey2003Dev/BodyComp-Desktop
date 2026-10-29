(() => {
  const input = document.querySelector("#profileNameInput");
  const form = document.querySelector("#renameProfileForm");
  const status = document.querySelector("#profileStatus");
  let current;
  const setStatus = (message, kind = "") => { status.textContent = message; status.className = `form-status ${kind}`; };
  async function load() {
    current = await window.MuscleRecoveryApi.getCurrentUser();
    if (!current) return window.location.assign("auth.html");
    input.value = current.displayName;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      await window.MuscleRecoveryApi.renameProfile(current.id, input.value);
      current.displayName = input.value.trim();
      setStatus("Local profile renamed.", "success");
    } catch (error) { setStatus(error.message || "Unable to rename profile.", "error"); }
  });
  document.querySelector("#switchProfile").addEventListener("click", () => window.location.assign("auth.html"));
  document.querySelector("#deleteProfile").addEventListener("click", async () => {
    if (!window.confirm(`Delete ${current.displayName} and all of its local workout data? This cannot be undone.`)) return;
    try { await window.MuscleRecoveryApi.deleteProfile(current.id); window.location.assign("auth.html"); }
    catch (error) { setStatus(error.message || "Unable to delete profile.", "error"); }
  });
  load().catch((error) => setStatus(error.message || "Unable to load local profile.", "error"));
})();
