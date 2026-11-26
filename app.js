(function () {
  'use strict';

  var ANILIST_URL = 'https://graphql.anilist.co';
  var STORAGE_TRACKER = 'akairis_wiki_tracker';

  var STATUS_LABELS = {
    watching: 'Watching',
    completed: 'Completed',
    plan: 'Plan to Watch',
    hold: 'On Hold',
    dropped: 'Dropped'
  };

  var MEDIA_CARD_FIELDS =
    'id isAdult format status episodes seasonYear averageScore ' +
    'title { romaji english native } ' +
    'coverImage { extraLarge large } ' +
    'bannerImage description(asHtml: false) genres';

  var state = {
    config: null,
    activeTab: 'home',
    searchType: 'both',
    searchQuery: '',
    genre: 'all',
    format: 'all',
    status: 'all',
    year: 'all',
    sort: 'POPULARITY_DESC',
    showMature: false,
    page: 1,
    hasNextPage: false,
    homeLoaded: false,
    homeData: null,
    airingLoaded: false,
    airingList: [],
    myListFilter: 'all',
    tracker: {},
    currentAnime: null,
    currentCharacter: null,
    cache: {
      anime: {},
      character: {}
    }
  };

  var els = {
    introOverlay: document.getElementById('intro-overlay'),
    introLoadingText: document.getElementById('intro-loading-text'),
    skipIntroBtn: document.getElementById('skip-intro-btn'),
    replayIntroBtn: document.getElementById('replay-intro-btn'),

    eyeLoader: document.getElementById('eye-loader'),
    eyeLoaderText: document.getElementById('eye-loader-text'),

    siteName: document.getElementById('site-name'),
    siteTagline: document.getElementById('site-tagline'),
    footerSiteName: document.getElementById('footer-site-name'),
    brandHomeLink: document.getElementById('brand-home-link'),
    footerCreditsBtn: document.getElementById('footer-credits-btn'),
    navBtns: document.querySelectorAll('.nav-btn[data-tab]'),

    appError: document.getElementById('app-error'),
    appErrorMsg: document.getElementById('app-error-msg'),
    retryLoadBtn: document.getElementById('retry-load-btn'),

    homeView: document.getElementById('home-view'),
    wikiView: document.getElementById('wiki-view'),
    characterView: document.getElementById('character-view'),
    airingView: document.getElementById('airing-view'),
    mylistView: document.getElementById('mylist-view'),
    creditsView: document.getElementById('credits-view'),

    /* Anime Wiki View */
    wikiBackBtn: document.getElementById('wiki-back-btn'),
    wikiShareBtn: document.getElementById('wiki-share-btn'),
    wikiShareStatus: document.getElementById('wiki-share-status'),
    wikiBannerImg: document.getElementById('wiki-banner-img'),
    wikiCover: document.getElementById('wiki-cover'),
    wikiInfobox: document.getElementById('wiki-infobox'),
    wikiFormatBadge: document.getElementById('wiki-format-badge'),
    wikiStatusBadge: document.getElementById('wiki-status-badge'),
    wikiScoreBadge: document.getElementById('wiki-score-badge'),
    wikiTitle: document.getElementById('wiki-title'),
    wikiNativeTitle: document.getElementById('wiki-native-title'),
    wikiAiringCountdown: document.getElementById('wiki-airing-countdown'),
    wikiGenres: document.getElementById('wiki-genres'),
    trackerStatus: document.getElementById('tracker-status'),
    trackerEpMinus: document.getElementById('tracker-ep-minus'),
    trackerEpCount: document.getElementById('tracker-ep-count'),
    trackerEpPlus: document.getElementById('tracker-ep-plus'),
    trackerScore: document.getElementById('tracker-score'),
    trackerNotes: document.getElementById('tracker-notes'),
    trackerSaveStatus: document.getElementById('tracker-save-status'),
    wikiSynopsis: document.getElementById('wiki-synopsis'),
    wikiTags: document.getElementById('wiki-tags'),
    wikiCharactersSection: document.getElementById('wiki-characters-section'),
    wikiCharactersGrid: document.getElementById('wiki-characters-grid'),
    wikiRelationsSection: document.getElementById('wiki-relations-section'),
    wikiRelationsGrid: document.getElementById('wiki-relations-grid'),
    wikiRecsSection: document.getElementById('wiki-recs-section'),
    wikiRecsGrid: document.getElementById('wiki-recs-grid'),

    /* Character Wiki View */
    charBackBtn: document.getElementById('char-back-btn'),
    charShareBtn: document.getElementById('char-share-btn'),
    charShareStatus: document.getElementById('char-share-status'),
    charCover: document.getElementById('char-cover'),
    charInfobox: document.getElementById('char-infobox'),
    charFavBadge: document.getElementById('char-fav-badge'),
    charTitle: document.getElementById('char-title'),
    charNativeTitle: document.getElementById('char-native-title'),
    charAltNames: document.getElementById('char-alt-names'),
    charBio: document.getElementById('char-bio'),
    charVaSection: document.getElementById('char-va-section'),
    charVaGrid: document.getElementById('char-va-grid'),
    charMediaSection: document.getElementById('char-media-section'),
    charMediaGrid: document.getElementById('char-media-grid'),

    /* Home & Search */
    heroBanner: document.getElementById('hero-banner'),
    heroBgImg: document.getElementById('hero-bg-img'),
    heroTitle: document.getElementById('hero-title'),
    heroMeta: document.getElementById('hero-meta'),
    heroSynopsis: document.getElementById('hero-synopsis'),
    heroReadBtn: document.getElementById('hero-read-btn'),

    searchForm: document.getElementById('search-form'),
    searchType: document.getElementById('search-type'),
    searchInput: document.getElementById('search-input'),
    randomAnimeBtn: document.getElementById('random-anime-btn'),
    genreFilter: document.getElementById('genre-filter'),
    formatFilter: document.getElementById('format-filter'),
    statusFilter: document.getElementById('status-filter'),
    yearFilter: document.getElementById('year-filter'),
    sortFilter: document.getElementById('sort-filter'),
    matureToggle: document.getElementById('mature-toggle'),

    charResultsSection: document.getElementById('char-results-section'),
    charResultsCount: document.getElementById('char-results-count'),
    charResultsGrid: document.getElementById('char-results-grid'),
    resultsSection: document.getElementById('results-section'),
    resultsTitle: document.getElementById('results-title'),
    resultsCount: document.getElementById('results-count'),
    resultsGrid: document.getElementById('results-grid'),
    loadMoreBtn: document.getElementById('load-more-btn'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),

    homeRows: document.getElementById('home-rows'),
    trendingGrid: document.getElementById('trending-grid'),
    seasonGrid: document.getElementById('season-grid'),
    topGrid: document.getElementById('top-grid'),
    moviesGrid: document.getElementById('movies-grid'),

    airingGrid: document.getElementById('airing-grid'),
    mylistClearBtn: document.getElementById('mylist-clear-btn'),
    mylistFilterBtns: document.querySelectorAll('[data-list-filter]'),
    mylistEmpty: document.getElementById('mylist-empty'),
    mylistGrid: document.getElementById('mylist-grid'),

    aboutStatement: document.getElementById('about-statement'),
    sourcesList: document.getElementById('sources-list'),
    takedownEmailLink: document.getElementById('takedown-email-link')
  };

  /* -------------------------------------------------------
     Storage & Intro / Eye Loader Helpers
     ------------------------------------------------------- */
  function readStorage(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  var introFailsafe = null;
  var introStartedAt = Date.now();

  function setIntroMessage(msg) {
    if (els.introLoadingText) {
      els.introLoadingText.textContent = msg;
    }
  }

  function dismissIntro() {
    if (introFailsafe) {
      clearTimeout(introFailsafe);
      introFailsafe = null;
    }
    if (!els.introOverlay || els.introOverlay.classList.contains('is-done')) return;
    els.introOverlay.classList.add('is-leaving');
    setTimeout(function () {
      if (els.introOverlay) els.introOverlay.classList.add('is-done');
    }, 450);
  }

  function finishIntroSmoothly() {
    var elapsed = Date.now() - introStartedAt;
    var wait = Math.max(0, 1200 - elapsed);
    setTimeout(dismissIntro, wait);
  }

  function startIntro() {
    introStartedAt = Date.now();
    if (document.documentElement.classList.contains('skip-intro')) {
      if (els.introOverlay) els.introOverlay.classList.add('is-done');
      return;
    }
    if (introFailsafe) clearTimeout(introFailsafe);
    introFailsafe = setTimeout(dismissIntro, 2850);
  }

  function replayIntro() {
    if (!els.introOverlay) return;
    document.documentElement.classList.remove('skip-intro');
    els.introOverlay.classList.remove('is-done', 'is-leaving');
    setIntroMessage('Awakening Akairis Encyclopedia...');
    introStartedAt = Date.now();
    if (introFailsafe) clearTimeout(introFailsafe);
    introFailsafe = setTimeout(dismissIntro, 2400);
  }

  function showEyeLoader(message) {
    els.appError.classList.add('hidden');
    els.eyeLoaderText.textContent = message || 'Loading from Akairis Encyclopedia...';
    els.eyeLoader.classList.remove('hidden');
  }

  function hideEyeLoader() {
    els.eyeLoader.classList.add('hidden');
  }

  /* -------------------------------------------------------
     Formatting & Safe Text Helpers
     ------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getTitle(media) {
    if (!media || !media.title) return 'Untitled';
    return media.title.english || media.title.romaji || media.title.native || 'Untitled';
  }

  function formatStatus(st) {
    var map = {
      RELEASING: 'Airing',
      FINISHED: 'Finished',
      NOT_YET_RELEASED: 'Upcoming',
      CANCELLED: 'Cancelled',
      HIATUS: 'Hiatus'
    };
    return map[st] || st || 'Unknown';
  }

  function formatCountdown(seconds) {
    var s = Math.max(0, Number(seconds) || 0);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (d > 0) return d + 'd ' + h + 'h';
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function cleanPlainSynopsis(raw) {
    return String(raw || 'No synopsis available.')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/~!([\s\S]*?)!~/g, '[Spoiler]');
  }

  function renderWikiRichText(containerEl, rawText, fallbackMsg) {
    containerEl.innerHTML = '';
    var cleaned = String(rawText || fallbackMsg || 'No information available.')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1');

    var parts = cleaned.split(/(~!|!~)/);
    var inSpoiler = false;

    for (var i = 0; i < parts.length; i++) {
      var chunk = parts[i];
      if (chunk === '~!') {
        inSpoiler = true;
        continue;
      }
      if (chunk === '!~') {
        inSpoiler = false;
        continue;
      }
      if (!chunk) continue;

      if (inSpoiler) {
        (function (spoilerText) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'spoiler-btn';
          btn.textContent = 'Reveal Spoiler';
          btn.addEventListener('click', function () {
            var span = document.createElement('span');
            span.className = 'spoiler-revealed';
            span.textContent = spoilerText;
            btn.replaceWith(span);
          });
          containerEl.appendChild(btn);
        })(chunk.trim());
      } else {
        containerEl.appendChild(document.createTextNode(chunk));
      }
    }
  }

  /* -------------------------------------------------------
     AniList GraphQL API Helper
     ------------------------------------------------------- */
  async function queryAniList(query, variables) {
    var cleanVars = {};
    Object.keys(variables || {}).forEach(function (k) {
      if (variables[k] !== undefined && variables[k] !== null && variables[k] !== '') {
        cleanVars[k] = variables[k];
      }
    });

    var res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query: query, variables: cleanVars })
    });

    var json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('Received an invalid response from the anime encyclopedia.');
    }

    if (!res.ok || (json.errors && json.errors.length)) {
      var msg = (json.errors && json.errors[0] && json.errors[0].message) || ('Request error ' + res.status);
      throw new Error(msg);
    }

    return json.data;
  }

  /* -------------------------------------------------------
     Load Config & Initial Home Data
     ------------------------------------------------------- */
  async function loadConfig() {
    try {
      var res = await fetch('config.json', { cache: 'no-store' });
      if (res.ok) {
        state.config = await res.json();
      }
    } catch (e) {}

    var cfg = state.config || {};
    var name = cfg.siteName || 'Akairis';
    els.siteName.textContent = name;
    els.footerSiteName.textContent = name;
    if (cfg.tagline) els.siteTagline.textContent = cfg.tagline;

    var disc = cfg.disclaimer || {};
    els.aboutStatement.textContent =
      disc.statement || 'Akairis is an independent anime and character encyclopedia.';
    var email = disc.takedownEmail || 'takedown@example.com';
    els.takedownEmailLink.textContent = email;
    els.takedownEmailLink.href = 'mailto:' + email;

    els.sourcesList.innerHTML = '';
    var sources = cfg.dataSources || [
      { name: 'AniList Open GraphQL API', url: 'https://anilist.co', role: 'Anime & character metadata' }
    ];
    sources.forEach(function (src) {
      var li = document.createElement('li');
      li.innerHTML =
        '<strong>' + escapeHtml(src.name) + '</strong> (' + escapeHtml(src.role || 'Metadata') + ')' +
        (src.url ? ' — <a class="crimson-link" href="' + escapeHtml(src.url) + '" target="_blank" rel="noopener noreferrer">Website ↗</a>' : '');
      els.sourcesList.appendChild(li);
    });
  }

  function populateYearFilter() {
    var currentYear = new Date().getFullYear() + 1;
    els.yearFilter.innerHTML = '<option value="all">All Years</option>';
    for (var y = currentYear; y >= 1970; y--) {
      var opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      els.yearFilter.appendChild(opt);
    }
  }

  async function loadHomeData() {
    setIntroMessage('Loading Trending & Seasonal Anime...');
    var adultArg = state.showMature ? undefined : false;

    var q =
      'query ($isAdult: Boolean) {' +
        'GenreCollection ' +
        'trending: Page(page: 1, perPage: 8) { media(type: ANIME, sort: [TRENDING_DESC], isAdult: $isAdult) { ' + MEDIA_CARD_FIELDS + ' } } ' +
        'airing: Page(page: 1, perPage: 8) { media(type: ANIME, status: RELEASING, sort: [POPULARITY_DESC], isAdult: $isAdult) { ' + MEDIA_CARD_FIELDS + ' } } ' +
        'top: Page(page: 1, perPage: 8) { media(type: ANIME, sort: [SCORE_DESC], isAdult: $isAdult) { ' + MEDIA_CARD_FIELDS + ' } } ' +
        'movies: Page(page: 1, perPage: 8) { media(type: ANIME, format: MOVIE, sort: [SCORE_DESC], isAdult: $isAdult) { ' + MEDIA_CARD_FIELDS + ' } } ' +
      '}';

    var data = await queryAniList(q, { isAdult: adultArg });
    state.homeData = data;
    state.homeLoaded = true;

    populateGenres(data.GenreCollection || []);
    renderHomeSections();
  }

  function populateGenres(genres) {
    var current = els.genreFilter.value || 'all';
    els.genreFilter.innerHTML = '<option value="all">All Genres</option>';
    genres.filter(function (g) {
      return state.showMature || g !== 'Hentai';
    }).forEach(function (g) {
      var opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      els.genreFilter.appendChild(opt);
    });
    els.genreFilter.value = current;
  }

  function renderHomeSections() {
    if (!state.homeData) return;
    var trending = (state.homeData.trending && state.homeData.trending.media) || [];
    var airing = (state.homeData.airing && state.homeData.airing.media) || [];
    var top = (state.homeData.top && state.homeData.top.media) || [];
    var movies = (state.homeData.movies && state.homeData.movies.media) || [];

    if (trending.length) {
      var hero = trending[0];
      els.heroBanner.classList.remove('hidden');
      els.heroTitle.textContent = getTitle(hero);
      els.heroMeta.textContent = [
        hero.format || 'ANIME',
        hero.seasonYear,
        hero.episodes ? hero.episodes + ' Ep' : null,
        hero.averageScore ? '★ ' + hero.averageScore + '%' : null
      ].filter(Boolean).join(' · ');
      els.heroSynopsis.textContent = cleanPlainSynopsis(hero.description);
      els.heroBgImg.src = hero.bannerImage || (hero.coverImage && hero.coverImage.extraLarge) || '';
      els.heroReadBtn.onclick = function () {
        openAnimeWiki(hero.id, getTitle(hero));
      };
    }

    fillAnimeGrid(els.trendingGrid, trending);
    fillAnimeGrid(els.seasonGrid, airing);
    fillAnimeGrid(els.topGrid, top);
    fillAnimeGrid(els.moviesGrid, movies);
  }

  function fillAnimeGrid(gridEl, list, append) {
    if (!append) gridEl.innerHTML = '';
    list.forEach(function (media) {
      if (!media || (!state.showMature && media.isAdult)) return;
      gridEl.appendChild(createAnimeCard(media));
    });
  }

  function createAnimeCard(media, extraLabel) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'anime-card';

    var tracked = state.tracker[String(media.id)];
    var listBadge = tracked && tracked.status && tracked.status !== 'none'
      ? '<span class="card-list-badge">' + escapeHtml(STATUS_LABELS[tracked.status] || tracked.status) + '</span>'
      : '';

    var cover = (media.coverImage && (media.coverImage.large || media.coverImage.extraLarge)) || '';
    var score = media.averageScore ? '<span class="card-score-overlay">★ ' + media.averageScore + '%</span>' : '';
    var badge = extraLabel || media.format || 'ANIME';

    btn.innerHTML =
      '<div class="anime-poster-wrap">' +
        '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(getTitle(media)) + '" loading="lazy">' +
        '<span class="card-tag-overlay">' + escapeHtml(badge) + '</span>' +
        listBadge +
        score +
      '</div>' +
      '<div class="anime-card-body">' +
        '<h3 class="anime-card-title">' + escapeHtml(getTitle(media)) + '</h3>' +
        '<div class="anime-card-meta">' +
          escapeHtml([media.seasonYear || 'TBA', media.episodes ? media.episodes + ' Ep' : formatStatus(media.status)].filter(Boolean).join(' · ')) +
        '</div>' +
      '</div>';

    btn.addEventListener('click', function () {
      openAnimeWiki(media.id, getTitle(media));
    });

    return btn;
  }

  function createCharacterCard(charObj, subText) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'char-card';
    var img = (charObj.image && (charObj.image.large || charObj.image.medium)) || '';
    var name = (charObj.name && charObj.name.full) || 'Unknown Character';

    btn.innerHTML =
      '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(name) + '" loading="lazy">' +
      '<div class="char-info">' +
        '<h3>' + escapeHtml(name) + '</h3>' +
        '<p>' + escapeHtml(subText || 'View character wiki →') + '</p>' +
      '</div>';

    btn.addEventListener('click', function () {
      openCharacterWiki(charObj.id, name);
    });
    return btn;
  }

  /* -------------------------------------------------------
     Navigation & View Switching
     ------------------------------------------------------- */
  function hideAllViews() {
    els.homeView.classList.add('hidden');
    els.wikiView.classList.add('hidden');
    els.characterView.classList.add('hidden');
    els.airingView.classList.add('hidden');
    els.mylistView.classList.add('hidden');
    els.creditsView.classList.add('hidden');
  }

  function switchTab(tab, clearHash) {
    state.activeTab = tab;
    state.currentAnime = null;
    state.currentCharacter = null;

    if (clearHash !== false && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    els.navBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });

    hideEyeLoader();
    els.appError.classList.add('hidden');
    hideAllViews();

    if (tab === 'home' || tab === 'browse') {
      els.homeView.classList.remove('hidden');
      if (tab === 'browse' && !hasActiveSearchOrFilters()) {
        runEncyclopediaSearch(false);
      } else if (tab === 'home' && !hasActiveSearchOrFilters()) {
        els.resultsSection.classList.add('hidden');
        els.charResultsSection.classList.add('hidden');
        els.emptyState.classList.add('hidden');
        els.homeRows.classList.remove('hidden');
        els.heroBanner.classList.remove('hidden');
      }
    } else if (tab === 'airing') {
      els.airingView.classList.remove('hidden');
      loadAiringSchedule();
    } else if (tab === 'mylist') {
      els.mylistView.classList.remove('hidden');
      renderMyList();
    } else if (tab === 'credits') {
      els.creditsView.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hasActiveSearchOrFilters() {
    return Boolean(
      state.searchQuery.trim() ||
      state.genre !== 'all' ||
      state.format !== 'all' ||
      state.status !== 'all' ||
      state.year !== 'all' ||
      state.activeTab === 'browse'
    );
  }

  /* -------------------------------------------------------
     Search & Encyclopedia Browsing
     ------------------------------------------------------- */
  async function runEncyclopediaSearch(append) {
    if (!append) {
      state.page = 1;
      els.resultsGrid.innerHTML = '';
      els.charResultsGrid.innerHTML = '';
    }

    var qStr = state.searchQuery.trim();
    var mode = state.searchType;

    if (!append) {
      els.homeRows.classList.add('hidden');
      els.heroBanner.classList.add('hidden');
      els.emptyState.classList.add('hidden');
      els.resultsSection.classList.add('hidden');
      els.charResultsSection.classList.add('hidden');
      showEyeLoader(
        qStr
          ? 'Searching Akairis Encyclopedia for "' + qStr + '"...'
          : 'Loading Anime Encyclopedia...'
      );
    }

    try {
      var needChars = (mode === 'both' || mode === 'characters') && !append && (qStr || mode === 'characters');
      var needAnime = mode === 'both' || mode === 'anime';

      var charPromise = needChars
        ? queryAniList(
            'query ($search: String) { Page(page: 1, perPage: 16) { characters(search: $search, sort: [FAVOURITES_DESC]) { id name { full native } image { large medium } favourites media(page: 1, perPage: 1, sort: [POPULARITY_DESC]) { nodes { id isAdult title { english romaji } } } } } }',
            { search: qStr || undefined }
          )
        : Promise.resolve(null);

      var animePromise = needAnime
        ? queryAniList(
            'query ($page: Int, $search: String, $genre: String, $format: MediaFormat, $status: MediaStatus, $year: Int, $sort: [MediaSort], $isAdult: Boolean) {' +
              'Page(page: $page, perPage: 24) {' +
                'pageInfo { hasNextPage total } ' +
                'media(type: ANIME, search: $search, genre: $genre, format: $format, status: $status, seasonYear: $year, sort: $sort, isAdult: $isAdult) { ' + MEDIA_CARD_FIELDS + ' }' +
              '}' +
            '}',
            {
              page: state.page,
              search: qStr || undefined,
              genre: state.genre !== 'all' ? state.genre : undefined,
              format: state.format !== 'all' ? state.format : undefined,
              status: state.status !== 'all' ? state.status : undefined,
              year: state.year !== 'all' ? Number(state.year) : undefined,
              sort: [state.sort],
              isAdult: state.showMature ? undefined : false
            }
          )
        : Promise.resolve(null);

      var results = await Promise.all([charPromise, animePromise]);
      hideEyeLoader();

      var charCount = 0;
      if (results[0] && results[0].Page && results[0].Page.characters) {
        var chars = results[0].Page.characters.filter(function (c) {
          if (state.showMature) return true;
          var topMedia = c.media && c.media.nodes && c.media.nodes[0];
          return !topMedia || !topMedia.isAdult;
        });
        charCount = chars.length;
        chars.forEach(function (c) {
          var firstShow = c.media && c.media.nodes && c.media.nodes[0];
          var sub = firstShow ? 'From: ' + getTitle(firstShow) : ('♥ ' + (c.favourites || 0) + ' Favorites');
          els.charResultsGrid.appendChild(createCharacterCard(c, sub));
        });
        els.charResultsCount.textContent = String(charCount);
        els.charResultsSection.classList.toggle('hidden', charCount === 0);
      }

      var animeCount = 0;
      if (results[1] && results[1].Page) {
        var pageData = results[1].Page;
        var list = pageData.media || [];
        fillAnimeGrid(els.resultsGrid, list, append);
        animeCount = els.resultsGrid.children.length;
        state.hasNextPage = Boolean(pageData.pageInfo && pageData.pageInfo.hasNextPage);
        els.resultsTitle.textContent = qStr ? 'Anime Results for "' + qStr + '"' : 'Anime Encyclopedia';
        els.resultsCount.textContent = String(animeCount);
        els.resultsSection.classList.toggle('hidden', animeCount === 0);
        els.loadMoreBtn.classList.toggle('hidden', !state.hasNextPage);
      }

      els.emptyState.classList.toggle('hidden', charCount > 0 || animeCount > 0);
    } catch (err) {
      hideEyeLoader();
      els.appErrorMsg.textContent = err.message || 'Search failed. Please try again.';
      els.appError.classList.remove('hidden');
    }
  }

  async function openRandomAnime() {
    hideAllViews();
    showEyeLoader('Picking a random anime from the encyclopedia...');
    try {
      var randPage = Math.floor(Math.random() * 140) + 1;
      var data = await queryAniList(
        'query ($page: Int, $isAdult: Boolean) { Page(page: $page, perPage: 10) { media(type: ANIME, sort: [POPULARITY_DESC], isAdult: $isAdult) { id title { english romaji } } } }',
        { page: randPage, isAdult: state.showMature ? undefined : false }
      );
      var list = (data.Page && data.Page.media) || [];
      if (!list.length) throw new Error('Could not pick a random anime right now.');
      var pick = list[Math.floor(Math.random() * list.length)];
      openAnimeWiki(pick.id, getTitle(pick));
    } catch (err) {
      hideEyeLoader();
      els.appErrorMsg.textContent = err.message;
      els.appError.classList.remove('hidden');
    }
  }

  /* -------------------------------------------------------
     Anime Wikipedia Page (#anime/ID)
     ------------------------------------------------------- */
  async function openAnimeWiki(id, labelHint, updateHash) {
    if (updateHash !== false) {
      var h = '#anime/' + id;
      if (window.location.hash !== h) window.location.hash = h;
    }

    hideAllViews();
    els.appError.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (state.cache.anime[id]) {
      renderAnimeWiki(state.cache.anime[id]);
      return;
    }

    showEyeLoader('Loading ' + (labelHint ? '"' + labelHint + '"' : 'anime') + ' wiki entry...');

    var q =
      'query ($id: Int) {' +
        'Media(id: $id, type: ANIME) {' +
          'id isAdult title { romaji english native } format status ' +
          'description(asHtml: false) season seasonYear episodes duration ' +
          'averageScore popularity source genres ' +
          'coverImage { extraLarge large } bannerImage ' +
          'nextAiringEpisode { episode timeUntilAiring } ' +
          'tags { name rank isMediaSpoiler } ' +
          'studios(isMain: true) { nodes { name } } ' +
          'characters(sort: [ROLE, FAVOURITES_DESC], perPage: 18) {' +
            'edges {' +
              'role ' +
              'node { id name { full native } image { large medium } } ' +
              'voiceActors(language: JAPANESE, sort: [RELEVANCE, FAVOURITES_DESC]) { id name { full } image { medium } }' +
            '}' +
          '} ' +
          'relations {' +
            'edges {' +
              'relationType ' +
              'node { id type format isAdult title { romaji english } coverImage { large } averageScore seasonYear }' +
            '}' +
          '} ' +
          'recommendations(sort: [RATING_DESC], perPage: 8) {' +
            'nodes {' +
              'mediaRecommendation { id type format isAdult title { romaji english } coverImage { large } averageScore seasonYear }' +
            '}' +
          '}' +
        '}' +
      '}';

    try {
      var data = await queryAniList(q, { id: Number(id) });
      hideEyeLoader();
      if (!data || !data.Media) throw new Error('Anime entry not found.');
      if (!state.showMature && data.Media.isAdult) {
        throw new Error('This 18+ title is hidden. Enable "Include 18+" in filters to view it.');
      }
      state.cache.anime[id] = data.Media;
      renderAnimeWiki(data.Media);
    } catch (err) {
      hideEyeLoader();
      els.appErrorMsg.textContent = err.message || 'Could not load anime details.';
      els.appError.classList.remove('hidden');
    }
  }

  function renderAnimeWiki(m) {
    state.currentAnime = m;
    state.currentCharacter = null;
    hideAllViews();
    els.wikiView.classList.remove('hidden');

    var cover = (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || '';
    els.wikiBannerImg.src = m.bannerImage || cover;
    els.wikiCover.src = cover;

    els.wikiFormatBadge.textContent = m.format || 'ANIME';
    els.wikiStatusBadge.textContent = formatStatus(m.status);
    els.wikiScoreBadge.textContent = m.averageScore ? '★ ' + m.averageScore + '%' : 'Unrated';

    els.wikiTitle.textContent = getTitle(m);
    var subNames = [];
    if (m.title.romaji && m.title.romaji !== getTitle(m)) subNames.push(m.title.romaji);
    if (m.title.native) subNames.push(m.title.native);
    els.wikiNativeTitle.textContent = subNames.join(' · ');

    if (m.nextAiringEpisode) {
      els.wikiAiringCountdown.textContent =
        'Episode ' + m.nextAiringEpisode.episode + ' airing in ' + formatCountdown(m.nextAiringEpisode.timeUntilAiring);
      els.wikiAiringCountdown.classList.remove('hidden');
    } else {
      els.wikiAiringCountdown.classList.add('hidden');
    }

    els.wikiGenres.innerHTML = (m.genres || []).map(function (g) {
      return '<span class="chip">' + escapeHtml(g) + '</span>';
    }).join('');

    var studios = (m.studios && m.studios.nodes || []).map(function (s) { return s.name; }).join(', ') || 'Unknown';
    var rows = [
      ['Format', m.format || '—'],
      ['Episodes', m.episodes ? String(m.episodes) : 'Ongoing / TBA'],
      ['Duration', m.duration ? m.duration + ' min' : '—'],
      ['Season', [m.season, m.seasonYear].filter(Boolean).join(' ') || 'TBA'],
      ['Studio', studios],
      ['Source', m.source ? m.source.replace(/_/g, ' ') : '—'],
      ['Popularity', m.popularity ? '#' + m.popularity.toLocaleString() + ' members' : '—']
    ];
    els.wikiInfobox.innerHTML = rows.map(function (r) {
      return '<div class="infobox-row"><span class="infobox-label">' + escapeHtml(r[0]) + '</span><span class="infobox-val">' + escapeHtml(r[1]) + '</span></div>';
    }).join('');

    renderWikiRichText(els.wikiSynopsis, m.description, 'No synopsis listed.');

    els.wikiTags.innerHTML = (m.tags || []).filter(function (t) { return !t.isMediaSpoiler; }).slice(0, 14).map(function (t) {
      return '<span class="chip">' + escapeHtml(t.name) + ' (' + t.rank + '%)</span>';
    }).join('');

    els.wikiShareStatus.classList.add('hidden');
    syncTrackerUI();

    /* Characters (clickable -> Character Wiki!) */
    var chars = (m.characters && m.characters.edges) || [];
    els.wikiCharactersGrid.innerHTML = '';
    chars.forEach(function (edge) {
      if (!edge.node) return;
      var va = edge.voiceActors && edge.voiceActors[0];
      var sub = (edge.role || 'CHARACTER') + (va ? ' · VA: ' + va.name.full : '');
      els.wikiCharactersGrid.appendChild(createCharacterCard(edge.node, sub));
    });
    els.wikiCharactersSection.classList.toggle('hidden', chars.length === 0);

    /* Relations */
    var rels = ((m.relations && m.relations.edges) || []).filter(function (e) {
      return e.node && e.node.type === 'ANIME' && (state.showMature || !e.node.isAdult);
    });
    els.wikiRelationsGrid.innerHTML = '';
    rels.forEach(function (e) {
      var relLabel = (e.relationType || 'RELATED').replace(/_/g, ' ');
      els.wikiRelationsGrid.appendChild(createAnimeCard(e.node, relLabel));
    });
    els.wikiRelationsSection.classList.toggle('hidden', rels.length === 0);

    /* Similar Anime */
    var recs = ((m.recommendations && m.recommendations.nodes) || []).map(function (n) {
      return n.mediaRecommendation;
    }).filter(function (rec) {
      return rec && rec.type === 'ANIME' && (state.showMature || !rec.isAdult);
    });
    els.wikiRecsGrid.innerHTML = '';
    recs.forEach(function (rec) {
      els.wikiRecsGrid.appendChild(createAnimeCard(rec));
    });
    els.wikiRecsSection.classList.toggle('hidden', recs.length === 0);
  }

  /* -------------------------------------------------------
     Full Character Wikipedia Page (#character/ID)
     ------------------------------------------------------- */
  async function openCharacterWiki(id, labelHint, updateHash) {
    if (updateHash !== false) {
      var h = '#character/' + id;
      if (window.location.hash !== h) window.location.hash = h;
    }

    hideAllViews();
    els.appError.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (state.cache.character[id]) {
      renderCharacterWiki(state.cache.character[id]);
      return;
    }

    showEyeLoader('Loading ' + (labelHint ? '"' + labelHint + '"' : 'character') + ' biography & cast...');

    var q =
      'query ($id: Int) {' +
        'Character(id: $id) {' +
          'id name { full native alternative } ' +
          'image { large } description(asHtml: false) ' +
          'gender dateOfBirth { year month day } age bloodType favourites ' +
          'media(sort: [POPULARITY_DESC], type: ANIME, perPage: 24) {' +
            'edges {' +
              'characterRole ' +
              'voiceActors(sort: [LANGUAGE, FAVOURITES_DESC]) { id name { full } image { medium } languageV2 } ' +
              'node { id type format isAdult episodes seasonYear averageScore title { romaji english } coverImage { large } }' +
            '}' +
          '}' +
        '}' +
      '}';

    try {
      var data = await queryAniList(q, { id: Number(id) });
      hideEyeLoader();
      if (!data || !data.Character) throw new Error('Character wiki entry not found.');
      state.cache.character[id] = data.Character;
      renderCharacterWiki(data.Character);
    } catch (err) {
      hideEyeLoader();
      els.appErrorMsg.textContent = err.message || 'Could not load character profile.';
      els.appError.classList.remove('hidden');
    }
  }

  function renderCharacterWiki(c) {
    state.currentCharacter = c;
    state.currentAnime = null;
    hideAllViews();
    els.characterView.classList.remove('hidden');

    els.charCover.src = (c.image && c.image.large) || '';
    els.charFavBadge.textContent = '♥ ' + (c.favourites || 0).toLocaleString() + ' Favorites';
    els.charTitle.textContent = (c.name && c.name.full) || 'Character';
    els.charNativeTitle.textContent = (c.name && c.name.native) || '';

    var alts = (c.name && c.name.alternative) || [];
    if (alts.length) {
      els.charAltNames.textContent = 'Also known as: ' + alts.join(', ');
      els.charAltNames.classList.remove('hidden');
    } else {
      els.charAltNames.classList.add('hidden');
    }

    var dob = c.dateOfBirth;
    var dobText = '—';
    if (dob && (dob.month || dob.day || dob.year)) {
      dobText = [dob.month, dob.day, dob.year].filter(Boolean).join('/');
    }

    var infoRows = [
      ['Age', c.age || '—'],
      ['Gender', c.gender || '—'],
      ['Birthday', dobText],
      ['Blood Type', c.bloodType || '—']
    ];
    els.charInfobox.innerHTML = infoRows.map(function (r) {
      return '<div class="infobox-row"><span class="infobox-label">' + escapeHtml(r[0]) + '</span><span class="infobox-val">' + escapeHtml(r[1]) + '</span></div>';
    }).join('');

    renderWikiRichText(els.charBio, c.description, 'No character biography recorded yet.');
    els.charShareStatus.classList.add('hidden');

    /* Deduplicate Voice Actors across anime appearances */
    var seenVa = {};
    var vaList = [];
    var mediaEdges = (c.media && c.media.edges) || [];

    mediaEdges.forEach(function (edge) {
      (edge.voiceActors || []).forEach(function (va) {
        if (!va || seenVa[va.id]) return;
        seenVa[va.id] = true;
        vaList.push(va);
      });
    });

    els.charVaGrid.innerHTML = '';
    vaList.slice(0, 8).forEach(function (va) {
      var card = document.createElement('div');
      card.className = 'char-card is-static';
      card.innerHTML =
        '<img src="' + escapeHtml((va.image && va.image.medium) || '') + '" alt="' + escapeHtml(va.name.full) + '" loading="lazy">' +
        '<div class="char-info">' +
          '<h3>' + escapeHtml(va.name.full) + '</h3>' +
          '<p>' + escapeHtml(va.languageV2 || 'Voice Actor') + '</p>' +
        '</div>';
      els.charVaGrid.appendChild(card);
    });
    els.charVaSection.classList.toggle('hidden', vaList.length === 0);

    /* Anime Appearances */
    var visibleAppearances = mediaEdges.filter(function (edge) {
      return edge.node && (state.showMature || !edge.node.isAdult);
    });
    els.charMediaGrid.innerHTML = '';
    visibleAppearances.forEach(function (edge) {
      els.charMediaGrid.appendChild(createAnimeCard(edge.node, edge.characterRole || 'ANIME'));
    });
    els.charMediaSection.classList.toggle('hidden', visibleAppearances.length === 0);
  }

  /* -------------------------------------------------------
     Personal Anime Tracker (localStorage)
     ------------------------------------------------------- */
  function syncTrackerUI() {
    var m = state.currentAnime;
    if (!m) return;
    var entry = state.tracker[String(m.id)] || { status: 'none', watchedEps: 0, score: 0, notes: '' };
    els.trackerStatus.value = entry.status || 'none';
    els.trackerScore.value = String(entry.score || 0);
    els.trackerNotes.value = entry.notes || '';
    els.trackerEpCount.textContent = (entry.watchedEps || 0) + ' / ' + (m.episodes || '?') + ' Ep';
  }

  function saveTrackerEntry(updates) {
    var m = state.currentAnime;
    if (!m) return;
    var key = String(m.id);
    var prev = state.tracker[key] || {
      id: m.id,
      title: getTitle(m),
      coverImage: (m.coverImage && (m.coverImage.large || m.coverImage.extraLarge)) || '',
      format: m.format || 'ANIME',
      episodes: m.episodes || null,
      averageScore: m.averageScore || null,
      seasonYear: m.seasonYear || null,
      status: 'watching',
      watchedEps: 0,
      score: 0,
      notes: ''
    };

    var next = Object.assign({}, prev, updates, { updatedAt: Date.now() });

    if (next.status === 'none' && !next.watchedEps && !next.score && !next.notes.trim()) {
      delete state.tracker[key];
    } else {
      if (next.status === 'none') next.status = 'watching';
      state.tracker[key] = next;
    }

    writeStorage(STORAGE_TRACKER, state.tracker);
    syncTrackerUI();
    els.trackerSaveStatus.textContent = 'Saved ✓';
    setTimeout(function () {
      els.trackerSaveStatus.textContent = 'Saved on this device';
    }, 1400);
  }

  function renderMyList() {
    var allEntries = Object.keys(state.tracker).map(function (k) {
      return state.tracker[k];
    }).sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    var filtered = allEntries.filter(function (item) {
      return state.myListFilter === 'all' || item.status === state.myListFilter;
    });

    els.mylistGrid.innerHTML = '';
    els.mylistEmpty.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach(function (item) {
      var mediaStub = {
        id: item.id,
        title: { english: item.title, romaji: item.title },
        coverImage: { large: item.coverImage },
        format: item.format,
        episodes: item.episodes,
        averageScore: item.averageScore,
        seasonYear: item.seasonYear
      };
      var epText = (item.watchedEps || 0) + '/' + (item.episodes || '?') + ' Ep';
      var card = createAnimeCard(mediaStub, epText);
      els.mylistGrid.appendChild(card);
    });
  }

  /* -------------------------------------------------------
     Airing Schedule View
     ------------------------------------------------------- */
  async function loadAiringSchedule() {
    if (state.airingLoaded && state.airingList.length) {
      renderAiringSchedule();
      return;
    }

    showEyeLoader('Loading upcoming anime airing schedule...');
    try {
      var data = await queryAniList(
        'query { Page(page: 1, perPage: 32) { airingSchedules(notYetAired: true, sort: [TIME]) { episode timeUntilAiring media { id isAdult format title { romaji english } coverImage { large } } } } }',
        {}
      );
      hideEyeLoader();
      state.airingList = (data.Page && data.Page.airingSchedules) || [];
      state.airingLoaded = true;
      renderAiringSchedule();
    } catch (err) {
      hideEyeLoader();
      els.appErrorMsg.textContent = err.message || 'Could not load airing schedule.';
      els.appError.classList.remove('hidden');
    }
  }

  function renderAiringSchedule() {
    els.airingGrid.innerHTML = '';
    state.airingList.forEach(function (item) {
      if (!item.media || (!state.showMature && item.media.isAdult)) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'airing-card';
      var name = getTitle(item.media);
      btn.innerHTML =
        '<img src="' + escapeHtml((item.media.coverImage && item.media.coverImage.large) || '') + '" alt="' + escapeHtml(name) + '" loading="lazy">' +
        '<div class="airing-info">' +
          '<h3>' + escapeHtml(name) + '</h3>' +
          '<p>Episode ' + escapeHtml(item.episode) + ' · in ' + escapeHtml(formatCountdown(item.timeUntilAiring)) + '</p>' +
        '</div>';
      btn.addEventListener('click', function () {
        openAnimeWiki(item.media.id, name);
      });
      els.airingGrid.appendChild(btn);
    });
  }

  /* -------------------------------------------------------
     Hash Routing (#anime/ID and #character/ID)
     ------------------------------------------------------- */
  function handleRouteFromHash() {
    var hash = window.location.hash || '';
    var animeMatch = hash.match(/^#anime\/(\d+)$/);
    if (animeMatch) {
      openAnimeWiki(Number(animeMatch[1]), '', false);
      return;
    }
    var charMatch = hash.match(/^#character\/(\d+)$/);
    if (charMatch) {
      openCharacterWiki(Number(charMatch[1]), '', false);
      return;
    }
    if (state.currentAnime || state.currentCharacter) {
      switchTab(state.activeTab, false);
    }
  }

  /* -------------------------------------------------------
     Bind Events & Boot App
     ------------------------------------------------------- */
  function bindEvents() {
    if (els.skipIntroBtn) els.skipIntroBtn.addEventListener('click', dismissIntro);
    if (els.replayIntroBtn) els.replayIntroBtn.addEventListener('click', replayIntro);

    els.navBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.dataset.tab);
      });
    });

    els.brandHomeLink.addEventListener('click', function (e) {
      e.preventDefault();
      state.searchQuery = '';
      els.searchInput.value = '';
      switchTab('home');
    });

    els.footerCreditsBtn.addEventListener('click', function () {
      switchTab('credits');
    });

    els.retryLoadBtn.addEventListener('click', bootApp);

    els.wikiBackBtn.addEventListener('click', function () {
      switchTab(state.activeTab);
    });
    els.charBackBtn.addEventListener('click', function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        switchTab(state.activeTab);
      }
    });

    function copyShare(statusEl) {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          statusEl.classList.remove('hidden');
          setTimeout(function () { statusEl.classList.add('hidden'); }, 1800);
        }).catch(function () { window.prompt('Copy this wiki link:', url); });
      } else {
        window.prompt('Copy this wiki link:', url);
      }
    }

    els.wikiShareBtn.addEventListener('click', function () { copyShare(els.wikiShareStatus); });
    els.charShareBtn.addEventListener('click', function () { copyShare(els.charShareStatus); });

    /* Tracker Controls */
    els.trackerStatus.addEventListener('change', function () {
      var val = els.trackerStatus.value;
      var m = state.currentAnime;
      var updates = { status: val };
      if (val === 'completed' && m && m.episodes) {
        updates.watchedEps = m.episodes;
      }
      saveTrackerEntry(updates);
    });

    els.trackerEpMinus.addEventListener('click', function () {
      if (!state.currentAnime) return;
      var cur = (state.tracker[String(state.currentAnime.id)] || {}).watchedEps || 0;
      saveTrackerEntry({ watchedEps: Math.max(0, cur - 1) });
    });

    els.trackerEpPlus.addEventListener('click', function () {
      if (!state.currentAnime) return;
      var m = state.currentAnime;
      var cur = (state.tracker[String(m.id)] || {}).watchedEps || 0;
      var nextEp = m.episodes ? Math.min(m.episodes, cur + 1) : cur + 1;
      var updates = { watchedEps: nextEp };
      if (m.episodes && nextEp >= m.episodes) updates.status = 'completed';
      saveTrackerEntry(updates);
    });

    els.trackerScore.addEventListener('change', function () {
      saveTrackerEntry({ score: Number(els.trackerScore.value) || 0 });
    });

    els.trackerNotes.addEventListener('change', function () {
      saveTrackerEntry({ notes: els.trackerNotes.value });
    });

    /* Search & Filter Listeners */
    els.searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      state.searchQuery = els.searchInput.value;
      state.searchType = els.searchType.value;
      runEncyclopediaSearch(false);
    });

    els.searchType.addEventListener('change', function () {
      state.searchType = els.searchType.value;
      if (hasActiveSearchOrFilters() || state.searchType === 'characters') {
        runEncyclopediaSearch(false);
      }
    });

    [els.genreFilter, els.formatFilter, els.statusFilter, els.yearFilter, els.sortFilter].forEach(function (sel) {
      sel.addEventListener('change', function () {
        state.genre = els.genreFilter.value;
        state.format = els.formatFilter.value;
        state.status = els.statusFilter.value;
        state.year = els.yearFilter.value;
        state.sort = els.sortFilter.value;
        if (hasActiveSearchOrFilters()) {
          runEncyclopediaSearch(false);
        } else {
          els.resultsSection.classList.add('hidden');
          els.homeRows.classList.remove('hidden');
          els.heroBanner.classList.remove('hidden');
        }
      });
    });

    els.matureToggle.addEventListener('change', function () {
      state.showMature = els.matureToggle.checked;
      loadHomeData().then(function () {
        if (hasActiveSearchOrFilters()) runEncyclopediaSearch(false);
        if (state.activeTab === 'airing') renderAiringSchedule();
      }).catch(function () {});
    });

    els.loadMoreBtn.addEventListener('click', function () {
      state.page += 1;
      runEncyclopediaSearch(true);
    });

    els.randomAnimeBtn.addEventListener('click', openRandomAnime);

    els.resetFiltersBtn.addEventListener('click', function () {
      state.searchQuery = '';
      state.searchType = 'both';
      state.genre = 'all';
      state.format = 'all';
      state.status = 'all';
      state.year = 'all';
      state.sort = 'POPULARITY_DESC';
      els.searchInput.value = '';
      els.searchType.value = 'both';
      els.genreFilter.value = 'all';
      els.formatFilter.value = 'all';
      els.statusFilter.value = 'all';
      els.yearFilter.value = 'all';
      els.sortFilter.value = 'POPULARITY_DESC';
      switchTab('home');
    });

    els.mylistFilterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.myListFilter = btn.dataset.listFilter;
        els.mylistFilterBtns.forEach(function (b) {
          b.classList.toggle('is-active', b.dataset.listFilter === state.myListFilter);
        });
        renderMyList();
      });
    });

    els.mylistClearBtn.addEventListener('click', function () {
      if (!window.confirm('Clear your entire personal anime list on this device?')) return;
      state.tracker = {};
      writeStorage(STORAGE_TRACKER, {});
      renderMyList();
    });

    window.addEventListener('hashchange', handleRouteFromHash);
  }

  async function bootApp() {
    els.appError.classList.add('hidden');
    startIntro();
    await loadConfig();

    try {
      await loadHomeData();
      els.homeView.classList.remove('hidden');
      finishIntroSmoothly();
      handleRouteFromHash();
    } catch (err) {
      dismissIntro();
      els.appErrorMsg.textContent = err.message || 'Unable to load the Akairis encyclopedia right now.';
      els.appError.classList.remove('hidden');
    }
  }

  state.tracker = readStorage(STORAGE_TRACKER, {});
  populateYearFilter();
  bindEvents();
  bootApp();
})();
