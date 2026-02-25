(function () {
  const STORAGE_KEYS = {
    onboardingSeen: "mst.onboarding.versionSeen",
    whatsNewSeen: "mst.onboarding.whatsNew.v1"
  };
  const ONBOARDING_VERSION = "1.0.0";

  const selectors = {
    banner: document.getElementById("onboardingBanner"),
    bannerText: document.getElementById("onboardingBannerText"),
    bannerPrimary: document.getElementById("onboardingActionPrimary"),
    bannerSecondary: document.getElementById("onboardingActionSecondary"),
    startTourBtn: document.getElementById("startTourBtn"),
    tourOverlay: document.getElementById("tourOverlay"),
    tourCard: document.getElementById("tourCard"),
    tourTitle: document.getElementById("tourTitle"),
    tourBody: document.getElementById("tourBody"),
    tourMeta: document.getElementById("tourMeta"),
    tourNextBtn: document.getElementById("tourNextBtn"),
    tourSkipBtn: document.getElementById("tourSkipBtn")
  };

  const tourSteps = [
    { selector: ".upload-card", title: "Upload your MST file", body: "Start by choosing your latest MST extract (.xlsx/.xls/.csv)." },
    { selector: "#batchNumber", title: "Enter batch number", body: "Provide the batch (e.g. LANDC...) so exported updates match your run." },
    { selector: "#openFilterBtn", title: "Use filters", body: "Open filters to narrow by work group, plant, discipline and more." },
    { selector: "#openGotoBtn", title: "Go directly to an MST", body: "Use Go to MST when planners need to jump to a known MST quickly." },
    { selector: "#newMSTBtn", title: "Create or bulk update", body: "Use + New MST for one item, or Bulk Update for multi-MST changes." },
    { selector: "#openResourceBtn", title: "Check planned hours", body: "Use Planned Hours Graph before finalising schedule moves." },
    { selector: "#exportBtnReview", title: "Export safely", body: "Use Export with Review to inspect changes before generating the spreadsheet." }
  ];

  let stepIndex = 0;
  let highlighted = null;

  function getVisibleEventCount() {
    return document.querySelectorAll("#calendarEl .fc-event").length;
  }

  function setBannerState(text, primaryLabel, primaryAction, secondaryLabel = "Dismiss", secondaryAction = hideBanner) {
    if (!selectors.banner || !selectors.bannerText) return;
    selectors.banner.style.display = "flex";
    selectors.bannerText.textContent = text;
    selectors.bannerPrimary.textContent = primaryLabel;
    selectors.bannerPrimary.onclick = primaryAction;
    selectors.bannerSecondary.textContent = secondaryLabel;
    selectors.bannerSecondary.onclick = secondaryAction;
  }

  function hideBanner() {
    if (selectors.banner) selectors.banner.style.display = "none";
  }

  function clearHighlight() {
    if (highlighted) highlighted.classList.remove("tour-highlight");
    highlighted = null;
  }

  function placeTourCard(target) {
    const card = selectors.tourCard;
    if (!card || !target) return;
    const rect = target.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const top = Math.min(window.innerHeight - cardRect.height - 8, rect.bottom + 8);
    const left = Math.max(8, Math.min(window.innerWidth - cardRect.width - 8, rect.left));
    card.style.top = `${Math.max(8, top)}px`;
    card.style.left = `${left}px`;
  }

  function closeTour(markSeen = true) {
    clearHighlight();
    if (selectors.tourOverlay) selectors.tourOverlay.style.display = "none";
    if (selectors.tourCard) selectors.tourCard.style.display = "none";
    if (markSeen) localStorage.setItem(STORAGE_KEYS.onboardingSeen, ONBOARDING_VERSION);
  }

  function showStep(idx) {
    const step = tourSteps[idx];
    if (!step) {
      closeTour(true);
      return;
    }

    const target = document.querySelector(step.selector);
    if (!target) {
      showStep(idx + 1);
      return;
    }

    clearHighlight();
    highlighted = target;
    highlighted.classList.add("tour-highlight");

    selectors.tourTitle.textContent = step.title;
    selectors.tourBody.textContent = step.body;
    selectors.tourMeta.textContent = `Step ${idx + 1} of ${tourSteps.length}`;
    selectors.tourNextBtn.textContent = idx === tourSteps.length - 1 ? "Finish" : "Next";

    selectors.tourOverlay.style.display = "block";
    selectors.tourCard.style.display = "block";
    placeTourCard(target);
  }

  function startTour() {
    stepIndex = 0;
    showStep(stepIndex);
  }

  function updateContextBanner() {
    const fileLocked = document.querySelector('label[for="fileInput"]')?.classList.contains("disabled");
    const batch = document.getElementById("batchNumber")?.value?.trim() || "";
    const changeCount = Object.keys(window.changes || {}).length;
    const createdCount = Object.keys(window.createdMSTs || {}).length;
    const eventCount = getVisibleEventCount();

    if (!fileLocked) {
      setBannerState("Start by uploading an MST extract to unlock filters, edits, and exports.", "Start guided tour", startTour);
      return;
    }

    if (!batch) {
      setBannerState("A batch number is required before export.", "Enter batch number", () => {
        document.getElementById("batchNumber")?.focus();
      });
      return;
    }

    if (!changeCount && !createdCount) {
      setBannerState("No amendments yet. Drag a green MST, run Bulk Update, or click + New MST.", "Open + New MST", () => {
        document.getElementById("newMSTBtn")?.click();
      });
      return;
    }

    if (!eventCount) {
      setBannerState(
        "No MSTs are visible. This is often caused by active filters.",
        "Reset filters",
        () => document.getElementById("resetFiltersBtn")?.click(),
        "Go to MST",
        () => document.getElementById("openGotoBtn")?.click()
      );
      return;
    }

    hideBanner();
  }

  function showWhatsNewCoachmark() {
    if (localStorage.getItem(STORAGE_KEYS.whatsNewSeen) === "true") return;
    setBannerState(
      "What’s new: Export with Review, guided tour, and contextual workflow hints are now available.",
      "Show me",
      () => {
        startTour();
        localStorage.setItem(STORAGE_KEYS.whatsNewSeen, "true");
      }
    );
    selectors.bannerSecondary.textContent = "Dismiss";
    selectors.bannerSecondary.onclick = () => {
      localStorage.setItem(STORAGE_KEYS.whatsNewSeen, "true");
      hideBanner();
    };
  }

  function init() {
    selectors.startTourBtn?.addEventListener("click", startTour);
    selectors.bannerPrimary?.addEventListener("click", startTour);
    selectors.bannerSecondary?.addEventListener("click", hideBanner);

    selectors.tourNextBtn?.addEventListener("click", () => {
      stepIndex += 1;
      showStep(stepIndex);
    });
    selectors.tourSkipBtn?.addEventListener("click", () => closeTour(true));
    selectors.tourOverlay?.addEventListener("click", () => closeTour(false));

    window.addEventListener("resize", () => {
      if (selectors.tourCard?.style.display === "block" && highlighted) {
        placeTourCard(highlighted);
      }
    });

    if (localStorage.getItem(STORAGE_KEYS.onboardingSeen) !== ONBOARDING_VERSION) {
      setBannerState("Welcome to MST Amendment Calendar. Take a 60-second guided tour.", "Start guided tour", startTour, "Skip", () => {
        localStorage.setItem(STORAGE_KEYS.onboardingSeen, ONBOARDING_VERSION);
        hideBanner();
      });
    } else {
      showWhatsNewCoachmark();
    }

    setInterval(updateContextBanner, 1800);
    setTimeout(updateContextBanner, 800);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
