let swRegistration = null;

function reloadPage() {
  // A hard navigation is enough; the new SW should already be active.
  location.reload();
}

function watchInstallingWorker(registration) {
  const installing = registration.installing;
  if (!installing) return;

  installing.addEventListener("statechange", () => {
    console.log("[pwa] installing worker state:", installing.state);

    // If there is already a controller, this is an update, not first install.
    if (installing.state === "installed" && navigator.serviceWorker.controller) {
      console.log("[pwa] update installed, reloading");
      reloadPage();
    }
  });
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("./sw.js", {
      updateViaCache: "none",
    });

    swRegistration = registration;
    console.log("[pwa] service worker registered", registration);

    if (registration.waiting) {
      console.log("[pwa] waiting worker already present, reloading");
      reloadPage();
    }

    registration.addEventListener("updatefound", () => {
      console.log("[pwa] update found");
      watchInstallingWorker(registration);
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[pwa] controller changed");
      // New SW took control.
      reloadPage();
    });

    // Proactively check once on startup.
    try {
      await registration.update();
      console.log("[pwa] explicit update check complete");
    } catch (err) {
      console.log("[pwa] explicit update check failed:", err);
    }

    // Check again when the app becomes visible.
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState !== "visible" || !swRegistration) return;
      try {
        await swRegistration.update();
        console.log("[pwa] visibility update check complete");
      } catch (err) {
        console.log("[pwa] visibility update check failed:", err);
      }
    });

    return registration;
  } catch (error) {
    console.log("[pwa] service worker registration failed:", error);
    return null;
  }
}
