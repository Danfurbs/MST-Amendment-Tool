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

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let spoofEditorActive = false;
  let spoofEditorSnapshot = null;

  const readDisplay = (el) => (el ? el.style.display : "");

  function restoreSpoofEditor() {
    if (!spoofEditorActive || !spoofEditorSnapshot) return;

    const detailsIntro = document.getElementById("detailsIntro");
    const editForm = document.getElementById("editForm");
    const tvActions = document.getElementById("tvActions");

    if (detailsIntro) detailsIntro.style.display = spoofEditorSnapshot.detailsIntroDisplay;
    if (editForm) editForm.style.display = spoofEditorSnapshot.editFormDisplay;
    if (tvActions) tvActions.style.display = spoofEditorSnapshot.tvActionsDisplay;

    spoofEditorActive = false;
    spoofEditorSnapshot = null;
  }

  function activateSpoofEditor() {
    if (spoofEditorActive) return;

    const detailsIntro = document.getElementById("detailsIntro");
    const editForm = document.getElementById("editForm");
    const tvActions = document.getElementById("tvActions");
    const tvAppliedLabel = document.getElementById("tvAppliedLabel");

    if (!editForm) return;

    spoofEditorSnapshot = {
      detailsIntroDisplay: readDisplay(detailsIntro),
      editFormDisplay: readDisplay(editForm),
      tvActionsDisplay: readDisplay(tvActions)
    };

    if (detailsIntro) detailsIntro.style.display = "none";
    editForm.style.display = "block";
    if (tvActions) tvActions.style.display = "block";
    if (tvAppliedLabel?.classList) tvAppliedLabel.classList.remove("visible");

    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    };

    setValue("equipDisplay", "DEMO-0001");
    setValue("stdJobDisplay", "123456");
    setValue("taskDisplay", "010");
    setValue("desc1Display", "Demo MST for onboarding tour");
    setValue("desc2Input", "Example amendment details shown for guided tour");
    setValue("lastDateInput", "2026-01-15");
    setValue("nextDateCalc", "2026-02-14");
    setValue("freqInput", "30");
    setValue("wgInput", "WGDEMO");
    setValue("unitsRequiredInput", "1");
    setValue("mileageFromInput", "12.125");
    setValue("mileageToInput", "12.875");
    setValue("tvReferenceInput", "TV-DEMO-001");
    setValue("tvExpiryInput", "2026-12-31");

    const equipDesc1 = document.getElementById("equipDesc1Display");
    const equipDesc2 = document.getElementById("equipDesc2Display");
    if (equipDesc1) equipDesc1.textContent = "Demo Equipment Description 1";
    if (equipDesc2) equipDesc2.textContent = "Demo Equipment Description 2";

    spoofEditorActive = true;
  }

  async function ensureEditorFormVisible() {
    const editForm = document.getElementById("editForm");
    if (editForm && editForm.style.display !== "none") return;

    const firstEvent = document.querySelector("#calendarEl .fc-event");
    if (firstEvent) {
      firstEvent.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await delay(220);
    }

    const isVisible = editForm && editForm.style.display !== "none";
    if (!isVisible) {
      activateSpoofEditor();
      await delay(50);
    }
  }

  const tourSteps = [
    { selector: ".upload-card", title: "Upload your MST file", body: "Start by choosing your latest MST extract (.xlsx/.xls/.csv)." },
    { selector: "#batchNumber", title: "Enter batch number", body: "Provide the batch (e.g. LANDC...) so exported updates match your run." },
    { selector: "#openFilterBtn", title: "Use filters", body: "Open filters to narrow by work group, plant, discipline and more." },
    { selector: "#openGotoBtn", title: "Go directly to an MST", body: "Use Go to MST when planners need to jump to a known MST quickly." },
    { selector: "#newMSTBtn", title: "Create or bulk update", body: "Use + New MST for one item, or Bulk Update for multi-MST changes." },
    { selector: "#sidebar", title: "MST details panel", body: "This left panel is where planners edit MST details once an MST is selected." },
    {
      selectors: ["#saveBtn", "#detailsIntro"],
      title: "Update MST details",
      body: "Select a green MST, then update fields and click Save Changes.",
      beforeShow: ensureEditorFormVisible
    },
    {
      selectors: ["#deactivateBtn", "#detailsIntro"],
      title: "Deactivate MST",
      body: "Use Deactivate MST when the MST should no longer generate future work.",
      beforeShow: ensureEditorFormVisible
    },
    {
      selectors: ["#applyTvBtn", "#tvActions"],
      title: "Apply a TV",
      body: "Use Apply TV to attach a Temporary Variation reference and expiry to the selected MST.",
      beforeShow: ensureEditorFormVisible
    },
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
    restoreSpoofEditor();
    if (selectors.tourOverlay) selectors.tourOverlay.style.display = "none";
    if (selectors.tourCard) selectors.tourCard.style.display = "none";
    if (markSeen) localStorage.setItem(STORAGE_KEYS.onboardingSeen, ONBOARDING_VERSION);
  }

  function resolveTarget(step) {
    if (!step) return null;
    if (step.selector) return document.querySelector(step.selector);
    if (Array.isArray(step.selectors)) {
      for (const selector of step.selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
    }
    return null;
  }

  async function showStep(idx) {
    const step = tourSteps[idx];
    if (!step) {
      closeTour(true);
      return;
    }

    if (typeof step.beforeShow === "function") {
      try {
        await step.beforeShow();
      } catch (err) {
        console.warn("Tour pre-step hook failed:", err);
      }
    }

    const target = resolveTarget(step);
    if (!target) {
      await showStep(idx + 1);
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

    selectors.tourNextBtn?.addEventListener("click", async () => {
      stepIndex += 1;
      await showStep(stepIndex);
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
