(function () {
  const appConfig = Object.assign(
    {
      googleMapsApiKey: "",
      censusApiKey: "",
      aiNarrativeEndpoint: "",
      useLiveData: false,
      mapStyleId: "",
      currencyCode: "INR"
    },
    window.SITE_SELECTOR_CONFIG || {}
  );

  const CRITERIA = [
    {
      key: "populationReach",
      label: "Population reach",
      detail: "Nearby population and customer catchment",
      direction: "benefit",
      defaultWeight: 18
    },
    {
      key: "spendingPower",
      label: "Spending power",
      detail: "Income capacity around the site",
      direction: "benefit",
      defaultWeight: 12
    },
    {
      key: "footTraffic",
      label: "Foot traffic",
      detail: "Visibility and daily movement around the site",
      direction: "benefit",
      defaultWeight: 16
    },
    {
      key: "supplierAccess",
      label: "Supplier access",
      detail: "Ease of reaching supply nodes and logistics",
      direction: "benefit",
      defaultWeight: 13
    },
    {
      key: "competition",
      label: "Competition pressure",
      detail: "Lower is better for entry pressure",
      direction: "cost",
      defaultWeight: 9
    },
    {
      key: "occupancyCost",
      label: "Occupancy cost",
      detail: "Estimated monthly cost for the required space",
      direction: "cost",
      defaultWeight: 14
    },
    {
      key: "transit",
      label: "Transit access",
      detail: "Road, metro, or bus accessibility",
      direction: "benefit",
      defaultWeight: 8
    },
    {
      key: "cluster",
      label: "Commercial cluster fit",
      detail: "Strength of nearby business ecosystem",
      direction: "benefit",
      defaultWeight: 5
    },
    {
      key: "landGrowth",
      label: "Land appreciation",
      detail: "Projected land-price upside",
      direction: "benefit",
      defaultWeight: 5
    }
  ];

  const BUSINESS_PROFILES = {
    restaurant: {
      label: "Restaurant / cafe",
      competitorKeyword: "restaurant",
      clusterKeyword: "office",
      supplierKeyword: "food wholesaler",
      trafficBias: 1.18,
      supplierBias: 1.02,
      clusterBias: 1.15,
      growthBias: 0.012,
      costSensitivity: 1.02
    },
    grocery: {
      label: "Grocery / supermarket",
      competitorKeyword: "supermarket",
      clusterKeyword: "residential",
      supplierKeyword: "wholesale market",
      trafficBias: 1.02,
      supplierBias: 1.1,
      clusterBias: 1.06,
      growthBias: 0.009,
      costSensitivity: 1.08
    },
    pharmacy: {
      label: "Pharmacy / clinic store",
      competitorKeyword: "pharmacy",
      clusterKeyword: "hospital",
      supplierKeyword: "medical distributor",
      trafficBias: 0.96,
      supplierBias: 1.14,
      clusterBias: 1.08,
      growthBias: 0.008,
      costSensitivity: 1
    },
    fashion: {
      label: "Fashion retail",
      competitorKeyword: "clothing store",
      clusterKeyword: "shopping mall",
      supplierKeyword: "apparel wholesaler",
      trafficBias: 1.16,
      supplierBias: 0.98,
      clusterBias: 1.2,
      growthBias: 0.013,
      costSensitivity: 1.1
    },
    electronics: {
      label: "Electronics showroom",
      competitorKeyword: "electronics store",
      clusterKeyword: "shopping center",
      supplierKeyword: "electronics wholesaler",
      trafficBias: 1.08,
      supplierBias: 1.08,
      clusterBias: 1.11,
      growthBias: 0.011,
      costSensitivity: 1.05
    },
    warehouse: {
      label: "Warehouse / fulfillment",
      competitorKeyword: "warehouse",
      clusterKeyword: "industrial area",
      supplierKeyword: "logistics service",
      trafficBias: 0.74,
      supplierBias: 1.24,
      clusterBias: 0.94,
      growthBias: 0.01,
      costSensitivity: 1.2
    }
  };

  const SUPPLIER_PROFILES = {
    local: {
      label: "Local supplier network",
      searchKeyword: "wholesaler",
      supplierBias: 1.1,
      transitBias: 0.95
    },
    regional: {
      label: "Regional distributor",
      searchKeyword: "distribution center",
      supplierBias: 1,
      transitBias: 1
    },
    national: {
      label: "National logistics chain",
      searchKeyword: "logistics company",
      supplierBias: 1.08,
      transitBias: 1.08
    },
    import: {
      label: "Import-heavy sourcing",
      searchKeyword: "cargo service",
      supplierBias: 1.16,
      transitBias: 1.14
    }
  };

  const CANDIDATE_PATTERNS = [
    {
      slug: "transit-core",
      title: "Transit Core",
      descriptor: "High commuter movement with strong visibility",
      latOffset: 0.016,
      lngOffset: 0.01,
      trafficBias: 1.18,
      clusterBias: 1.08,
      supplierBias: 0.97,
      populationBias: 1.08,
      incomeBias: 1.05,
      priceBias: 1.22
    },
    {
      slug: "residential-catchment",
      title: "Residential Catchment",
      descriptor: "Family-heavy demand with stable repeat business",
      latOffset: -0.014,
      lngOffset: 0.012,
      trafficBias: 0.96,
      clusterBias: 0.94,
      supplierBias: 0.9,
      populationBias: 1.16,
      incomeBias: 0.96,
      priceBias: 0.92
    },
    {
      slug: "mixed-use-mile",
      title: "Mixed-Use Mile",
      descriptor: "Balanced retail, offices, and neighborhood demand",
      latOffset: 0.01,
      lngOffset: -0.015,
      trafficBias: 1.08,
      clusterBias: 1.14,
      supplierBias: 1,
      populationBias: 1.02,
      incomeBias: 1.09,
      priceBias: 1.08
    },
    {
      slug: "logistics-belt",
      title: "Logistics Belt",
      descriptor: "Fast supplier turnaround and road access",
      latOffset: -0.019,
      lngOffset: -0.012,
      trafficBias: 0.82,
      clusterBias: 0.88,
      supplierBias: 1.22,
      populationBias: 0.84,
      incomeBias: 0.93,
      priceBias: 0.84
    }
  ];

  const state = {
    selectedSiteId: null,
    lastRun: null,
    map: null,
    markers: [],
    googleLoaded: false,
    placeService: null,
    geocoder: null
  };

  const dom = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheDom();
    renderWeightControls();
    updateWeightTotal();
    attachEvents();
    updateIntegrationCards({
      maps: appConfig.googleMapsApiKey && appConfig.useLiveData ? "ready" : "demo",
      census: appConfig.censusApiKey && appConfig.useLiveData ? "ready" : "demo",
      ai: appConfig.aiNarrativeEndpoint ? "ready" : "demo"
    });
    handleAnalyze();
  });

  function cacheDom() {
    dom.form = document.getElementById("analysis-form");
    dom.businessType = document.getElementById("business-type");
    dom.supplierModel = document.getElementById("supplier-model");
    dom.targetLocation = document.getElementById("target-location");
    dom.searchRadius = document.getElementById("search-radius");
    dom.monthlyBudget = document.getElementById("monthly-budget");
    dom.requiredArea = document.getElementById("required-area");
    dom.forecastYears = document.getElementById("forecast-years");
    dom.weightSliders = document.getElementById("weight-sliders");
    dom.weightTotal = document.getElementById("weight-total");
    dom.resetWeights = document.getElementById("reset-weights");
    dom.analyzeButton = document.getElementById("analyze-button");
    dom.formStatus = document.getElementById("form-status");
    dom.rankedResults = document.getElementById("ranked-results");
    dom.resultsMeta = document.getElementById("results-meta");
    dom.mapStage = document.getElementById("map-stage");
    dom.siteList = document.getElementById("site-list");
    dom.forecastSummary = document.getElementById("forecast-summary");
    dom.forecastChart = document.getElementById("forecast-chart");
    dom.forecastDetails = document.getElementById("forecast-details");
    dom.forecastMeta = document.getElementById("forecast-meta");
    dom.googleStatusCard = document.getElementById("google-status-card");
    dom.censusStatusCard = document.getElementById("census-status-card");
    dom.aiStatusCard = document.getElementById("ai-status-card");
    dom.googleStatusTitle = document.getElementById("google-status-title");
    dom.googleStatusCopy = document.getElementById("google-status-copy");
    dom.censusStatusTitle = document.getElementById("census-status-title");
    dom.censusStatusCopy = document.getElementById("census-status-copy");
    dom.aiStatusTitle = document.getElementById("ai-status-title");
    dom.aiStatusCopy = document.getElementById("ai-status-copy");
  }

  function renderWeightControls() {
    dom.weightSliders.innerHTML = CRITERIA.map(function (criterion) {
      return (
        '<label class="weight-card">' +
        '<div class="weight-card-head">' +
        "<div>" +
        "<strong>" + escapeHtml(criterion.label) + "</strong>" +
        "<small>" + escapeHtml(criterion.detail) + "</small>" +
        "</div>" +
        '<output id="weight-output-' + criterion.key + '">' + criterion.defaultWeight + "%</output>" +
        "</div>" +
        '<input type="range" min="0" max="30" step="1" value="' + criterion.defaultWeight + '" data-weight-key="' + criterion.key + '" aria-label="' + escapeHtml(criterion.label) + ' weight">' +
        "</label>"
      );
    }).join("");
  }

  function attachEvents() {
    dom.form.addEventListener("submit", function (event) {
      event.preventDefault();
      handleAnalyze();
    });

    dom.weightSliders.addEventListener("input", function (event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const key = target.dataset.weightKey;
      if (!key) {
        return;
      }
      const output = document.getElementById("weight-output-" + key);
      if (output) {
        output.textContent = target.value + "%";
      }
      updateWeightTotal();
    });

    dom.resetWeights.addEventListener("click", function () {
      CRITERIA.forEach(function (criterion) {
        const slider = dom.weightSliders.querySelector('[data-weight-key="' + criterion.key + '"]');
        const output = document.getElementById("weight-output-" + criterion.key);
        if (slider) {
          slider.value = String(criterion.defaultWeight);
        }
        if (output) {
          output.textContent = criterion.defaultWeight + "%";
        }
      });
      updateWeightTotal();
    });

    dom.rankedResults.addEventListener("click", function (event) {
      const button = event.target.closest("[data-site-id]");
      if (!button || !state.lastRun) {
        return;
      }
      selectSite(button.dataset.siteId);
    });

    dom.siteList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-site-id]");
      if (!button || !state.lastRun) {
        return;
      }
      selectSite(button.dataset.siteId);
    });

    dom.mapStage.addEventListener("click", function (event) {
      const button = event.target.closest("[data-site-id]");
      if (!button || !state.lastRun) {
        return;
      }
      selectSite(button.dataset.siteId);
    });
  }

  async function handleAnalyze() {
    const input = readFormState();
    setStatus("Running MCDA analysis and land forecast...", "loading");
    dom.analyzeButton.disabled = true;

    try {
      let mapsLive = false;

      if (appConfig.useLiveData && appConfig.googleMapsApiKey) {
        try {
          await ensureGoogleMaps();
          mapsLive = !!window.google && !!window.google.maps;
        } catch (error) {
          mapsLive = false;
          updateIntegrationCards({
            maps: "warning",
            census: appConfig.useLiveData && input.isUnitedStates ? "ready" : "demo",
            ai: appConfig.aiNarrativeEndpoint ? "ready" : "demo"
          });
        }
      }

      const baseLocation = await resolveBaseLocation(input.targetLocation, mapsLive);
      input.isUnitedStates = baseLocation.countryCode === "US";
      const canUseLiveDemographics = mapsLive && input.isUnitedStates && appConfig.useLiveData;

      const sites = buildCandidateSites(baseLocation, input);
      const enrichedSites = [];

      for (let index = 0; index < sites.length; index += 1) {
        const site = sites[index];
        const metrics = mapsLive
          ? await buildLiveMetrics(site, input)
          : buildSyntheticMetrics(site, input);

        const demographics = canUseLiveDemographics
          ? await fetchCensusDemographics(site).catch(function () {
            return buildSyntheticDemographics(site, input);
          })
          : buildSyntheticDemographics(site, input);

        const combinedMetrics = Object.assign({}, metrics, demographics);
        const forecast = buildLandForecast(site, combinedMetrics, input);
        combinedMetrics.landGrowth = forecast.totalReturnPct;

        enrichedSites.push(
          Object.assign({}, site, {
            metrics: combinedMetrics,
            forecast: forecast
          })
        );
      }

      const rankedSites = runMcda(enrichedSites, input);
      state.lastRun = {
        input: input,
        baseLocation: baseLocation,
        sites: rankedSites,
        mapsLive: mapsLive
      };
      state.selectedSiteId = rankedSites[0] ? rankedSites[0].id : null;

      await attachNarrative(rankedSites[0], input);
      renderAnalysis();

      updateIntegrationCards({
        maps: mapsLive ? "ready" : (appConfig.googleMapsApiKey ? "warning" : "demo"),
        census: canUseLiveDemographics ? "ready" : "demo",
        ai: appConfig.aiNarrativeEndpoint ? "ready" : "demo"
      });
      setStatus("Analysis complete. Ranked " + rankedSites.length + " candidate sites.", "success");
    } catch (error) {
      console.error(error);
      setStatus("The analysis could not complete. Check the inputs or live API configuration.", "error");
      dom.rankedResults.innerHTML = '<div class="empty-state">No result was generated. The app is still ready for demo mode, so retry with the default settings.</div>';
      dom.siteList.innerHTML = "";
      dom.forecastSummary.innerHTML = '<div class="empty-state">Forecast details will appear here after a successful run.</div>';
      dom.forecastChart.innerHTML = "";
      dom.forecastDetails.innerHTML = "";
      dom.resultsMeta.textContent = "The last run did not complete.";
      dom.forecastMeta.textContent = "No active forecast.";
      renderMockMap([]);
    } finally {
      dom.analyzeButton.disabled = false;
    }
  }

  function readFormState() {
    return {
      businessType: dom.businessType.value,
      supplierModel: dom.supplierModel.value,
      targetLocation: dom.targetLocation.value.trim() || "Pune, Maharashtra",
      searchRadiusKm: clampNumber(Number(dom.searchRadius.value) || 6, 1, 25),
      monthlyBudget: Math.max(10000, Number(dom.monthlyBudget.value) || 250000),
      requiredAreaSqft: Math.max(100, Number(dom.requiredArea.value) || 1800),
      forecastYears: clampNumber(Number(dom.forecastYears.value) || 5, 2, 10),
      weights: getWeightValues(),
      isUnitedStates: false
    };
  }

  function getWeightValues() {
    return CRITERIA.reduce(function (accumulator, criterion) {
      const slider = dom.weightSliders.querySelector('[data-weight-key="' + criterion.key + '"]');
      accumulator[criterion.key] = slider ? Number(slider.value) || criterion.defaultWeight : criterion.defaultWeight;
      return accumulator;
    }, {});
  }

  function updateWeightTotal() {
    const weights = getWeightValues();
    const total = Object.values(weights).reduce(function (sum, value) {
      return sum + value;
    }, 0);
    dom.weightTotal.textContent = "Current slider total: " + total + "%. The MCDA engine auto-normalizes these values.";
  }

  function setStatus(message, tone) {
    dom.formStatus.textContent = message;
    dom.formStatus.classList.remove("is-loading", "is-success", "is-error");

    if (tone === "loading") {
      dom.formStatus.classList.add("is-loading");
    } else if (tone === "success") {
      dom.formStatus.classList.add("is-success");
    } else if (tone === "error") {
      dom.formStatus.classList.add("is-error");
    }
  }

  function updateIntegrationCards(flags) {
    applyCardState(dom.googleStatusCard, flags.maps);
    applyCardState(dom.censusStatusCard, flags.census);
    applyCardState(dom.aiStatusCard, flags.ai);

    if (flags.maps === "ready") {
      dom.googleStatusTitle.textContent = "Live geocoding and cluster scan";
      dom.googleStatusCopy.textContent = "Google Maps JavaScript and Places are ready to geocode the target area and estimate nearby suppliers, competitors, transit, and parking.";
    } else if (flags.maps === "warning") {
      dom.googleStatusTitle.textContent = "Maps key present, fallback active";
      dom.googleStatusCopy.textContent = "A live Maps request was not completed, so the app switched back to deterministic demo signals for this run.";
    } else {
      dom.googleStatusTitle.textContent = "Demo maps";
      dom.googleStatusCopy.textContent = "Add a Google Maps API key in config.js to geocode locations and count nearby business clusters.";
    }

    if (flags.census === "ready") {
      dom.censusStatusTitle.textContent = "US Census tract lookup";
      dom.censusStatusCopy.textContent = "Population reach and spending power are being pulled through the Census geocoder and ACS profile endpoints for US locations.";
    } else {
      dom.censusStatusTitle.textContent = "Synthetic demographics";
      dom.censusStatusCopy.textContent = "Population and spending power are simulated when live mode is off or the chosen location is outside the US Census coverage path.";
    }

    if (flags.ai === "ready") {
      dom.aiStatusTitle.textContent = "External AI narrative enabled";
      dom.aiStatusCopy.textContent = "The dashboard can request a richer site explanation from your own secure AI endpoint after the numeric forecast is calculated.";
    } else {
      dom.aiStatusTitle.textContent = "Local forecast engine";
      dom.aiStatusCopy.textContent = "The ranking already includes a local predictive model for land prices, with templated narrative when no external AI endpoint is configured.";
    }
  }

  function applyCardState(card, mode) {
    card.classList.remove("is-live", "is-demo", "is-warning");
    if (mode === "ready") {
      card.classList.add("is-live");
    } else if (mode === "warning") {
      card.classList.add("is-warning");
    } else {
      card.classList.add("is-demo");
    }
  }

  async function ensureGoogleMaps() {
    if (state.googleLoaded && window.google && window.google.maps) {
      return window.google;
    }

    if (!appConfig.googleMapsApiKey) {
      throw new Error("Missing Google Maps API key.");
    }

    return new Promise(function (resolve, reject) {
      const existing = document.getElementById("google-maps-script");
      if (existing) {
        existing.addEventListener("load", function () {
          state.googleLoaded = true;
          resolve(window.google);
        });
        existing.addEventListener("error", function () {
          reject(new Error("Google Maps script failed to load."));
        });
        return;
      }

      const callbackName = "__vendorVistaMapsLoaded";
      window[callbackName] = function () {
        state.googleLoaded = true;
        resolve(window.google);
      };

      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(appConfig.googleMapsApiKey) +
        "&libraries=places&callback=" +
        callbackName;
      script.async = true;
      script.defer = true;
      script.onerror = function () {
        reject(new Error("Google Maps script failed to load."));
      };
      document.head.appendChild(script);
    });
  }

  async function resolveBaseLocation(query, mapsLive) {
    if (mapsLive && window.google && window.google.maps) {
      if (!state.geocoder) {
        state.geocoder = new window.google.maps.Geocoder();
      }

      const result = await new Promise(function (resolve, reject) {
        state.geocoder.geocode({ address: query }, function (results, status) {
          if (status === "OK" && results && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error("Unable to geocode address."));
          }
        });
      });

      const countryComponent = (result.address_components || []).find(function (component) {
        return (component.types || []).indexOf("country") !== -1;
      });

      return {
        address: result.formatted_address,
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        countryCode: countryComponent ? countryComponent.short_name : inferCountryCode(query)
      };
    }

    const fallbackCountry = inferCountryCode(query);
    const fallbackLat = fallbackCountry === "US"
      ? seededRange(query + "-lat", 29.3, 40.8)
      : seededRange(query + "-lat", 12.8, 28.6);
    const fallbackLng = fallbackCountry === "US"
      ? seededRange(query + "-lng", -122.4, -72.5)
      : seededRange(query + "-lng", 72.8, 88.2);

    return {
      address: query,
      lat: fallbackLat,
      lng: fallbackLng,
      countryCode: fallbackCountry
    };
  }

  function buildCandidateSites(baseLocation, input) {
    const scale = Math.max(0.65, Math.min(1.45, input.searchRadiusKm / 5));

    return CANDIDATE_PATTERNS.map(function (pattern, index) {
      return {
        id: pattern.slug + "-" + index,
        title: pattern.title,
        descriptor: pattern.descriptor,
        seed: input.targetLocation + "-" + input.businessType + "-" + pattern.slug,
        address: pattern.title + " zone near " + baseLocation.address,
        pattern: pattern,
        location: {
          lat: baseLocation.lat + pattern.latOffset * scale,
          lng: baseLocation.lng + pattern.lngOffset * scale
        }
      };
    });
  }

  function buildSyntheticMetrics(site, input) {
    const businessProfile = BUSINESS_PROFILES[input.businessType];
    const supplierProfile = SUPPLIER_PROFILES[input.supplierModel];
    const demographics = buildSyntheticDemographics(site, input);
    const competitorCount = Math.round(
      seededRange(site.seed + "-competitors", 4, 24) *
      businessProfile.clusterBias *
      site.pattern.clusterBias
    );
    const supplierNodes = Math.round(
      seededRange(site.seed + "-suppliers", 3, 16) *
      supplierProfile.supplierBias *
      site.pattern.supplierBias
    );
    const transitNodes = Math.round(
      seededRange(site.seed + "-transit", 2, 12) * supplierProfile.transitBias
    );
    const parkingNodes = Math.round(seededRange(site.seed + "-parking", 2, 10));
    const complementaryBusinesses = Math.round(
      seededRange(site.seed + "-cluster", 5, 28) *
      businessProfile.clusterBias *
      site.pattern.clusterBias
    );

    const landPriceCurrent = Math.round(
      seededRange(site.seed + "-land", 4200, 17000) *
      site.pattern.priceBias *
      (1 + clampNumber(demographics.spendingPower / 280000, 0.12, 0.68))
    );

    const occupancyCost = Math.round(
      landPriceCurrent * input.requiredAreaSqft * 0.0064 * businessProfile.costSensitivity
    );

    return {
      populationReach: demographics.populationReach,
      spendingPower: demographics.spendingPower,
      footTraffic: Math.round(
        seededRange(site.seed + "-traffic", 1600, 11500) *
        businessProfile.trafficBias *
        site.pattern.trafficBias
      ),
      supplierAccess: clampNumber(
        supplierNodes * 6 + transitNodes * 3 + parkingNodes * 2 + 8,
        18,
        100
      ),
      competition: clampNumber(competitorCount * 3.2, 10, 100),
      occupancyCost: occupancyCost,
      transit: clampNumber(transitNodes * 9 + parkingNodes * 2, 10, 100),
      cluster: clampNumber(complementaryBusinesses * 3.4 - competitorCount * 1.25, 18, 100),
      landGrowth: 0,
      landPriceCurrent: landPriceCurrent,
      rawNearbyCompetitors: competitorCount,
      rawSupplierNodes: supplierNodes,
      rawTransitNodes: transitNodes,
      rawParkingNodes: parkingNodes,
      rawComplementaryBusinesses: complementaryBusinesses
    };
  }

  function buildSyntheticDemographics(site, input) {
    const businessProfile = BUSINESS_PROFILES[input.businessType];
    return {
      populationReach: Math.round(
        seededRange(site.seed + "-population", 32000, 230000) *
        site.pattern.populationBias *
        businessProfile.trafficBias
      ),
      spendingPower: Math.round(
        seededRange(site.seed + "-income", 35000, 175000) *
        site.pattern.incomeBias
      )
    };
  }

  async function buildLiveMetrics(site, input) {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return buildSyntheticMetrics(site, input);
    }

    if (!state.map) {
      state.map = new window.google.maps.Map(dom.mapStage, {
        center: site.location,
        zoom: 13,
        disableDefaultUI: true,
        mapId: appConfig.mapStyleId || undefined
      });
    }

    if (!state.placeService) {
      state.placeService = new window.google.maps.places.PlacesService(state.map);
    }

    const businessProfile = BUSINESS_PROFILES[input.businessType];
    const supplierProfile = SUPPLIER_PROFILES[input.supplierModel];
    const radius = Math.max(1000, Math.min(7000, input.searchRadiusKm * 450));
    const location = new window.google.maps.LatLng(site.location.lat, site.location.lng);

    const competitorCount = await countNearbyPlaces({
      location: location,
      radius: radius,
      keyword: businessProfile.competitorKeyword
    });
    const complementaryBusinesses = await countNearbyPlaces({
      location: location,
      radius: radius,
      keyword: businessProfile.clusterKeyword
    });
    const supplierNodes = await countNearbyPlaces({
      location: location,
      radius: radius,
      keyword: supplierProfile.searchKeyword || businessProfile.supplierKeyword
    });
    const transitNodes = await countNearbyPlaces({
      location: location,
      radius: radius,
      keyword: "transit station"
    });
    const parkingNodes = await countNearbyPlaces({
      location: location,
      radius: radius,
      keyword: "parking"
    });

    const landPriceCurrent = Math.round(
      (3800 +
        complementaryBusinesses * 115 +
        transitNodes * 180 +
        parkingNodes * 75 +
        seededRange(site.seed + "-live-land", 1500, 5200)) *
      site.pattern.priceBias
    );

    const occupancyCost = Math.round(
      landPriceCurrent * input.requiredAreaSqft * 0.0062 * businessProfile.costSensitivity
    );

    return {
      populationReach: 0,
      spendingPower: 0,
      footTraffic: Math.round(
        1400 +
        transitNodes * 260 +
        complementaryBusinesses * 140 +
        parkingNodes * 65
      ),
      supplierAccess: clampNumber(
        supplierNodes * 7 + transitNodes * 2 + parkingNodes * 1.5 + 10,
        18,
        100
      ),
      competition: clampNumber(competitorCount * 4, 8, 100),
      occupancyCost: occupancyCost,
      transit: clampNumber(transitNodes * 10 + parkingNodes * 3, 10, 100),
      cluster: clampNumber(complementaryBusinesses * 4 - competitorCount * 1.15, 12, 100),
      landGrowth: 0,
      landPriceCurrent: landPriceCurrent,
      rawNearbyCompetitors: competitorCount,
      rawSupplierNodes: supplierNodes,
      rawTransitNodes: transitNodes,
      rawParkingNodes: parkingNodes,
      rawComplementaryBusinesses: complementaryBusinesses
    };
  }

  async function countNearbyPlaces(request) {
    if (!state.placeService) {
      return 0;
    }

    return new Promise(function (resolve) {
      let total = 0;
      let done = false;

      function handleResults(results, status, pagination) {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && Array.isArray(results)) {
          total += results.length;

          if (pagination && pagination.hasNextPage && total < 60) {
            window.setTimeout(function () {
              pagination.nextPage();
            }, 250);
            return;
          }
        }

        if (!done) {
          done = true;
          resolve(total);
        }
      }

      state.placeService.nearbySearch(request, handleResults);
    });
  }

  async function fetchCensusDemographics(site) {
    const geoUrl = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
    geoUrl.searchParams.set("x", String(site.location.lng));
    geoUrl.searchParams.set("y", String(site.location.lat));
    geoUrl.searchParams.set("benchmark", "Public_AR_Current");
    geoUrl.searchParams.set("vintage", "Current_Current");
    geoUrl.searchParams.set("format", "json");

    const geoData = await fetchJson(geoUrl.toString());
    const tract = geoData &&
      geoData.result &&
      geoData.result.geographies &&
      geoData.result.geographies["Census Tracts"] &&
      geoData.result.geographies["Census Tracts"][0];

    if (!tract) {
      throw new Error("No census tract returned.");
    }

    const profileUrl = new URL("https://api.census.gov/data/2023/acs/acs5/profile");
    profileUrl.searchParams.set("get", "NAME,DP05_0001E,DP03_0062E");
    profileUrl.searchParams.set("for", "tract:" + tract.TRACT);
    profileUrl.searchParams.set("in", "state:" + tract.STATE + " county:" + tract.COUNTY);
    if (appConfig.censusApiKey) {
      profileUrl.searchParams.set("key", appConfig.censusApiKey);
    }

    const profileData = await fetchJson(profileUrl.toString());
    if (!Array.isArray(profileData) || profileData.length < 2) {
      throw new Error("No census profile row returned.");
    }

    const row = profileData[1];
    return {
      populationReach: Number(row[1]) || 0,
      spendingPower: Number(row[2]) || 0
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Request failed for " + url);
    }
    return response.json();
  }

  function buildLandForecast(site, metrics, input) {
    const historyYears = 4;
    const demandSignal =
      scaleValue(metrics.populationReach, 25000, 240000) * 0.22 +
      scaleValue(metrics.spendingPower, 30000, 180000) * 0.16 +
      scaleValue(metrics.footTraffic, 1200, 13000) * 0.19 +
      scaleValue(metrics.supplierAccess, 10, 100) * 0.11 +
      scaleValue(metrics.transit, 10, 100) * 0.11 +
      scaleValue(metrics.cluster, 10, 100) * 0.11 +
      (1 - scaleValue(metrics.competition, 5, 100)) * 0.06 +
      (1 - scaleValue(metrics.occupancyCost, 20000, 400000)) * 0.04;

    const businessProfile = BUSINESS_PROFILES[input.businessType];
    const historicalCagr = clampNumber(
      seededRange(site.seed + "-history-cagr", 0.035, 0.105) +
      (site.pattern.priceBias - 1) * 0.04,
      0.03,
      0.14
    );

    const forecastCagr = clampNumber(
      historicalCagr * 0.55 +
      demandSignal * 0.1 +
      businessProfile.growthBias -
      (businessProfile.costSensitivity - 1) * 0.02,
      0.025,
      0.2
    );

    const history = [];
    const projection = [];
    const currentYear = new Date().getFullYear();
    const basePrice = metrics.landPriceCurrent;

    for (let step = historyYears; step >= 0; step -= 1) {
      const year = currentYear - step;
      const noise = seededRange(site.seed + "-history-" + year, -0.03, 0.03);
      const value = Math.round(
        basePrice / Math.pow(1 + historicalCagr + noise, step)
      );
      history.push({
        label: String(year),
        value: Math.max(1000, value)
      });
    }

    for (let yearIndex = 1; yearIndex <= input.forecastYears; yearIndex += 1) {
      const year = currentYear + yearIndex;
      const value = Math.round(basePrice * Math.pow(1 + forecastCagr, yearIndex));
      projection.push({
        label: String(year),
        value: value
      });
    }

    const projectedPrice = projection[projection.length - 1].value;
    const totalReturnPct = ((projectedPrice - basePrice) / basePrice) * 100;
    const confidence = clampNumber(
      0.58 + demandSignal * 0.24 - Math.abs(forecastCagr - historicalCagr) * 0.8,
      0.46,
      0.91
    );

    return {
      history: history,
      projection: projection,
      currentPrice: basePrice,
      projectedPrice: projectedPrice,
      cagr: forecastCagr,
      totalReturnPct: totalReturnPct,
      confidence: confidence,
      confidenceLabel: confidence > 0.75 ? "High confidence" : confidence > 0.6 ? "Medium confidence" : "Exploratory confidence",
      riskLabel: forecastCagr > 0.12 ? "Aggressive upside" : forecastCagr > 0.08 ? "Balanced growth" : "Stable appreciation",
      narrative: ""
    };
  }

  function runMcda(sites, input) {
    const normalizedWeights = normalizeWeights(input.weights);
    const ranges = CRITERIA.reduce(function (accumulator, criterion) {
      const values = sites.map(function (site) {
        return site.metrics[criterion.key];
      });
      accumulator[criterion.key] = {
        min: Math.min.apply(null, values),
        max: Math.max.apply(null, values)
      };
      return accumulator;
    }, {});

    return sites
      .map(function (site) {
        let weightedScore = 0;
        const breakdown = CRITERIA.map(function (criterion) {
          const range = ranges[criterion.key];
          const normalized = normalizeCriterionValue(
            site.metrics[criterion.key],
            range.min,
            range.max,
            criterion.direction
          );
          const contribution = normalized * normalizedWeights[criterion.key] * 100;
          weightedScore += contribution;
          return {
            key: criterion.key,
            label: criterion.label,
            rawValue: site.metrics[criterion.key],
            normalizedScore: normalized,
            weightedContribution: contribution
          };
        }).sort(function (left, right) {
          return right.weightedContribution - left.weightedContribution;
        });

        const budgetDelta = input.monthlyBudget - site.metrics.occupancyCost;
        return Object.assign({}, site, {
          weightedScore: weightedScore,
          breakdown: breakdown,
          budgetDelta: budgetDelta,
          topDrivers: breakdown.slice(0, 3)
        });
      })
      .sort(function (left, right) {
        return right.weightedScore - left.weightedScore;
      })
      .map(function (site, index) {
        return Object.assign({}, site, { rank: index + 1 });
      });
  }

  async function attachNarrative(site, input) {
    if (!site) {
      return;
    }

    const fallbackNarrative = buildNarrative(site, input);
    site.forecast.narrative = fallbackNarrative;

    if (!appConfig.aiNarrativeEndpoint) {
      return;
    }

    try {
      const response = await fetch(appConfig.aiNarrativeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          businessType: BUSINESS_PROFILES[input.businessType].label,
          supplierModel: SUPPLIER_PROFILES[input.supplierModel].label,
          site: {
            title: site.title,
            address: site.address,
            score: Number(site.weightedScore.toFixed(1)),
            forecastCagr: Number((site.forecast.cagr * 100).toFixed(2)),
            currentPrice: site.forecast.currentPrice,
            projectedPrice: site.forecast.projectedPrice
          },
          metrics: site.metrics,
          topDrivers: site.topDrivers
        })
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload && typeof payload.summary === "string" && payload.summary.trim()) {
          site.forecast.narrative = payload.summary.trim();
        }
      }
    } catch (error) {
      site.forecast.narrative = fallbackNarrative;
    }
  }

  function buildNarrative(site, input) {
    const driverLabels = site.topDrivers.map(function (item) {
      return item.label.toLowerCase();
    });
    const driverText = driverLabels.slice(0, 2).join(" and ");
    const businessLabel = BUSINESS_PROFILES[input.businessType].label;
    return (
      site.title +
      " is the strongest fit for a " +
      businessLabel.toLowerCase() +
      " because it leads on " +
      driverText +
      ". The model expects " +
      formatPercent(site.forecast.cagr) +
      " annual land appreciation, taking the site from " +
      formatCurrency(site.forecast.currentPrice) +
      " per sq ft today to about " +
      formatCurrency(site.forecast.projectedPrice) +
      " per sq ft in " +
      input.forecastYears +
      " years."
    );
  }

  function renderAnalysis() {
    if (!state.lastRun || !state.lastRun.sites.length) {
      return;
    }

    const selectedSite = getSelectedSite();
    renderResultCards(state.lastRun.sites);
    renderSiteList(state.lastRun.sites);
    renderForecast(selectedSite, state.lastRun.input);
    renderMap(state.lastRun.baseLocation, state.lastRun.sites, state.lastRun.mapsLive);
    dom.resultsMeta.textContent =
      "Compared " +
      state.lastRun.sites.length +
      " candidate sites around " +
      state.lastRun.baseLocation.address +
      " using 9 MCDA factors and a " +
      state.lastRun.input.forecastYears +
      "-year land forecast.";
  }

  function renderResultCards(sites) {
    dom.rankedResults.innerHTML = sites.map(function (site, index) {
      const isSelected = site.id === state.selectedSiteId;
      const budgetLabel = site.budgetDelta >= 0
        ? "Within budget by " + formatCurrency(site.budgetDelta)
        : "Over budget by " + formatCurrency(Math.abs(site.budgetDelta));

      return (
        '<button class="result-card' +
        (index === 0 ? " is-top" : "") +
        (isSelected ? " is-selected" : "") +
        '" data-site-id="' + site.id + '" type="button">' +
        '<div class="result-head">' +
        '<span class="rank-chip">Rank #' + site.rank + "</span>" +
        '<div class="score-value"><strong>' + site.weightedScore.toFixed(1) + '</strong><span>MCDA score</span></div>' +
        "</div>" +
        "<div>" +
        "<h3>" + escapeHtml(site.title) + "</h3>" +
        "<p>" + escapeHtml(site.descriptor) + "</p>" +
        "</div>" +
        '<div class="metric-grid">' +
        metricPanel("Current land price", formatCurrency(site.metrics.landPriceCurrent) + " / sq ft") +
        metricPanel("Projected value", formatCurrency(site.forecast.projectedPrice) + " / sq ft") +
        metricPanel("Occupancy cost", formatCurrency(site.metrics.occupancyCost) + " / month") +
        metricPanel("Growth outlook", formatPercent(site.forecast.cagr) + " CAGR") +
        "</div>" +
        '<div class="score-bars">' +
        site.topDrivers.map(function (driver) {
          return (
            '<div class="score-bar">' +
            "<label>" +
            escapeHtml(driver.label) +
            " <strong>" +
            driver.weightedContribution.toFixed(1) +
            " pts</strong></label>" +
            '<div class="bar-track"><div class="bar-fill" style="width:' +
            (driver.normalizedScore * 100).toFixed(1) +
            '%"></div></div>' +
            "</div>"
          );
        }).join("") +
        "</div>" +
        '<span class="budget-pill ' + (site.budgetDelta >= 0 ? "good" : "bad") + '">' + budgetLabel + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function metricPanel(label, value) {
    return (
      '<div class="metric-panel">' +
      "<span>" + escapeHtml(label) + "</span>" +
      "<strong>" + escapeHtml(value) + "</strong>" +
      "</div>"
    );
  }

  function renderSiteList(sites) {
    dom.siteList.innerHTML = sites.map(function (site) {
      const selected = site.id === state.selectedSiteId;
      return (
        '<button class="site-row' + (selected ? " is-selected" : "") + '" data-site-id="' + site.id + '" type="button">' +
        '<div class="site-row-head">' +
        "<div>" +
        "<h3>" + escapeHtml(site.title) + "</h3>" +
        '<p class="site-subcopy">' + escapeHtml(site.address) + "</p>" +
        "</div>" +
        '<span class="site-pill">Score ' + site.weightedScore.toFixed(1) + "</span>" +
        "</div>" +
        '<div class="site-meta">' +
        siteMeta("Competitors", String(site.metrics.rawNearbyCompetitors)) +
        siteMeta("Supplier nodes", String(site.metrics.rawSupplierNodes)) +
        siteMeta("Transit nodes", String(site.metrics.rawTransitNodes)) +
        "</div>" +
        "</button>"
      );
    }).join("");
  }

  function siteMeta(label, value) {
    return "<div><span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
  }

  function renderForecast(site, input) {
    if (!site) {
      dom.forecastSummary.innerHTML = '<div class="empty-state">Select a site to see forecast details.</div>';
      dom.forecastChart.innerHTML = "";
      dom.forecastDetails.innerHTML = "";
      dom.forecastMeta.textContent = "Select a site to inspect its forecast.";
      return;
    }

    dom.forecastMeta.textContent =
      site.title +
      " selected for detailed " +
      input.forecastYears +
      "-year land-price projection.";

    dom.forecastSummary.innerHTML =
      '<article class="forecast-card">' +
      "<h3>" + escapeHtml(site.title) + "</h3>" +
      '<p class="forecast-copy">' + escapeHtml(site.forecast.narrative || buildNarrative(site, input)) + "</p>" +
      '<div class="forecast-metrics">' +
      metricPanel("Expected CAGR", formatPercent(site.forecast.cagr)) +
      metricPanel("Confidence", site.forecast.confidenceLabel) +
      metricPanel("Return over horizon", formatSignedPercent(site.forecast.totalReturnPct / 100)) +
      metricPanel("Forecast risk", site.forecast.riskLabel) +
      "</div>" +
      "</article>";

    dom.forecastChart.innerHTML = buildForecastSvg(site);
    dom.forecastDetails.innerHTML =
      '<div class="detail-grid">' +
      detailCard("Current land value", formatCurrency(site.forecast.currentPrice) + " / sq ft") +
      detailCard("Projected land value", formatCurrency(site.forecast.projectedPrice) + " / sq ft") +
      detailCard("Estimated occupancy", formatCurrency(site.metrics.occupancyCost) + " / month") +
      detailCard("Commercial cluster fit", site.metrics.cluster.toFixed(0) + " / 100") +
      detailCard("Population reach", formatCompactNumber(site.metrics.populationReach)) +
      detailCard("Spending power", formatCurrency(site.metrics.spendingPower)) +
      "</div>";
  }

  function detailCard(label, value) {
    return (
      '<article class="detail-card">' +
      "<span>" + escapeHtml(label) + "</span>" +
      "<strong>" + escapeHtml(value) + "</strong>" +
      "</article>"
    );
  }

  function buildForecastSvg(site) {
    const history = site.forecast.history;
    const projection = site.forecast.projection;
    const points = history.concat(projection);
    const width = 720;
    const height = 240;
    const padding = 24;
    const minValue = Math.min.apply(null, points.map(function (point) { return point.value; }));
    const maxValue = Math.max.apply(null, points.map(function (point) { return point.value; }));
    const valueRange = Math.max(1, maxValue - minValue);

    function toX(index) {
      return padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
    }

    function toY(value) {
      return height - padding - ((value - minValue) / valueRange) * (height - padding * 2);
    }

    const historyPath = history.map(function (point, index) {
      return (index === 0 ? "M" : "L") + toX(index).toFixed(2) + " " + toY(point.value).toFixed(2);
    }).join(" ");

    const forecastStart = history.length - 1;
    const projectionPath = projection.map(function (point, index) {
      const absoluteIndex = forecastStart + index;
      return (index === 0 ? "M" : "L") + toX(absoluteIndex).toFixed(2) + " " + toY(point.value).toFixed(2);
    }).join(" ");

    const guideLines = [0, 0.25, 0.5, 0.75, 1].map(function (ratio) {
      const y = padding + (height - padding * 2) * ratio;
      return '<line x1="' + padding + '" y1="' + y.toFixed(2) + '" x2="' + (width - padding) + '" y2="' + y.toFixed(2) + '" stroke="rgba(19,32,45,0.10)" stroke-width="1"></line>';
    }).join("");

    const labels = points.map(function (point, index) {
      const x = toX(index);
      return '<text x="' + x.toFixed(2) + '" y="' + (height - 6) + '" font-size="11" fill="#5d6874" text-anchor="middle">' + escapeHtml(point.label) + "</text>";
    }).join("");

    const historyDots = history.map(function (point, index) {
      return '<circle cx="' + toX(index).toFixed(2) + '" cy="' + toY(point.value).toFixed(2) + '" r="4" fill="#174c64"></circle>';
    }).join("");

    const projectionDots = projection.map(function (point, index) {
      const absoluteIndex = forecastStart + index;
      return '<circle cx="' + toX(absoluteIndex).toFixed(2) + '" cy="' + toY(point.value).toFixed(2) + '" r="4" fill="#1f8a70"></circle>';
    }).join("");

    return (
      '<div class="chart-wrap">' +
      '<div class="chart-labels">' +
      '<span class="legend-dot" style="color:#174c64">Historical price</span>' +
      '<span class="legend-dot" style="color:#1f8a70">Forecast price</span>' +
      "</div>" +
      '<svg viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="Land price forecast chart">' +
      guideLines +
      '<path d="' + historyPath + '" fill="none" stroke="#174c64" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>' +
      '<path d="' + projectionPath + '" fill="none" stroke="#1f8a70" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8 6"></path>' +
      historyDots +
      projectionDots +
      labels +
      "</svg>" +
      "</div>"
    );
  }

  function renderMap(baseLocation, sites, mapsLive) {
    if (mapsLive && window.google && window.google.maps) {
      dom.mapStage.classList.add("is-live");

      if (!state.map) {
        state.map = new window.google.maps.Map(dom.mapStage, {
          center: baseLocation,
          zoom: 13,
          disableDefaultUI: true,
          mapId: appConfig.mapStyleId || undefined
        });
      } else {
        state.map.setCenter(baseLocation);
      }

      clearMarkers();

      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(baseLocation);

      const baseMarker = new window.google.maps.Marker({
        position: baseLocation,
        map: state.map,
        title: "Search center"
      });

      state.markers.push(baseMarker);

      sites.forEach(function (site) {
        const marker = new window.google.maps.Marker({
          position: site.location,
          map: state.map,
          title: site.title,
          label: String(site.rank)
        });
        marker.addListener("click", function () {
          selectSite(site.id);
        });
        state.markers.push(marker);
        bounds.extend(site.location);
      });

      state.map.fitBounds(bounds, 60);
      return;
    }

    clearMarkers();
    state.map = null;
    state.placeService = null;
    dom.mapStage.classList.remove("is-live");
    renderMockMap(sites, baseLocation);
  }

  function renderMockMap(sites, baseLocation) {
    if (!sites || !sites.length) {
      dom.mapStage.innerHTML = '<div class="map-fallback"></div><div class="map-caption">Map preview will appear after the next analysis run.</div>';
      return;
    }

    const latValues = sites.map(function (site) { return site.location.lat; });
    const lngValues = sites.map(function (site) { return site.location.lng; });
    const minLat = Math.min.apply(null, latValues);
    const maxLat = Math.max.apply(null, latValues);
    const minLng = Math.min.apply(null, lngValues);
    const maxLng = Math.max.apply(null, lngValues);
    const latRange = Math.max(0.0001, maxLat - minLat);
    const lngRange = Math.max(0.0001, maxLng - minLng);

    const pins = sites.map(function (site) {
      const left = 14 + ((site.location.lng - minLng) / lngRange) * 72;
      const top = 78 - ((site.location.lat - minLat) / latRange) * 56;
      return (
        '<div class="mock-pin' + (site.id === state.selectedSiteId ? " is-selected" : "") + '" style="left:' + left.toFixed(2) + "%;top:" + top.toFixed(2) + '%">' +
        '<button data-site-id="' + site.id + '" type="button">' + site.rank + "</button>" +
        "<span>" + escapeHtml(site.title) + "</span>" +
        "</div>"
      );
    }).join("");

    dom.mapStage.innerHTML =
      '<div class="map-fallback"></div>' +
      pins +
      '<div class="map-caption">Mock location canvas centered on ' + escapeHtml(baseLocation.address || "the selected city") + "</div>";
  }

  function clearMarkers() {
    state.markers.forEach(function (marker) {
      marker.setMap(null);
    });
    state.markers = [];
  }

  function selectSite(siteId) {
    state.selectedSiteId = siteId;
    if (!state.lastRun) {
      return;
    }

    const selectedSite = getSelectedSite();
    if (!selectedSite) {
      return;
    }

    renderResultCards(state.lastRun.sites);
    renderSiteList(state.lastRun.sites);
    renderForecast(selectedSite, state.lastRun.input);
    renderMap(state.lastRun.baseLocation, state.lastRun.sites, state.lastRun.mapsLive);
  }

  function getSelectedSite() {
    if (!state.lastRun) {
      return null;
    }
    return state.lastRun.sites.find(function (site) {
      return site.id === state.selectedSiteId;
    }) || state.lastRun.sites[0] || null;
  }

  function normalizeWeights(weightValues) {
    const total = Object.values(weightValues).reduce(function (sum, value) {
      return sum + value;
    }, 0) || 1;

    return Object.keys(weightValues).reduce(function (accumulator, key) {
      accumulator[key] = weightValues[key] / total;
      return accumulator;
    }, {});
  }

  function normalizeCriterionValue(value, min, max, direction) {
    if (max === min) {
      return 1;
    }
    const ratio = (value - min) / (max - min);
    return direction === "cost" ? 1 - ratio : ratio;
  }

  function inferCountryCode(query) {
    const lowered = String(query).toLowerCase();
    if (
      lowered.indexOf("usa") !== -1 ||
      lowered.indexOf("united states") !== -1 ||
      lowered.indexOf("california") !== -1 ||
      lowered.indexOf("texas") !== -1 ||
      lowered.indexOf("new york") !== -1 ||
      lowered.indexOf("illinois") !== -1 ||
      lowered.indexOf("washington") !== -1
    ) {
      return "US";
    }
    return "IN";
  }

  function seededRange(seed, min, max) {
    let hash = 0;
    const text = String(seed);
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(index);
      hash |= 0;
    }
    const normalized = (Math.abs(hash) % 10000) / 10000;
    return min + normalized * (max - min);
  }

  function scaleValue(value, min, max) {
    if (max === min) {
      return 1;
    }
    return clampNumber((value - min) / (max - min), 0, 1);
  }

  function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: appConfig.currencyCode || "INR",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function formatPercent(decimal) {
    return (decimal * 100).toFixed(1) + "%";
  }

  function formatSignedPercent(decimal) {
    const pct = decimal * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
  }

  function formatCompactNumber(value) {
    return new Intl.NumberFormat("en-IN", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value || 0);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
