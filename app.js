(function () {
  'use strict';

  var STORAGE_INTRO = 'akairis_intro_seen';
  var STORAGE_BOOKMARKS = 'akairis_bookmarks';
  var STORAGE_HISTORY = 'akairis_history';
  var STORAGE_POSITIONS = 'akairis_positions';
  var STORAGE_WATCHED = 'akairis_watched';

  var state = {
    config: null,
    catalog: null,
    allowlistSet: new Set(),
    activeTab: 'all',
    search: '',
    genre: 'all',
    language: 'all',
    tag: 'all',
    sort: 'newest',
    showMature: false,
    bookmarks: [],
    history: [],
    positions: {},
    watched: {},
    theater: null,
    detail: null,
    ytApiPromise: null,
    ytPlayerInstance: null,
    progressTimer: null,
    isSeeking: false,
    lastSavedSec: 0,
    autoplayTimer: null,
    autoplaySeconds: 5
  };

  var els = {
    introOverlay: document.getElementById('intro-overlay'),
    skipIntroBtn: document.getElementById('skip-intro-btn'),
    replayIntroBtn: document.getElementById('replay-intro-btn'),
    siteName: document.getElementById('site-name'),
    siteTagline: document.getElementById('site-tagline'),
    footerSiteName: document.getElementById('footer-site-name'),
    brandHomeLink: document.getElementById('brand-home-link'),
    footerCreditsBtn: document.getElementById('footer-credits-btn'),
    navBtns: document.querySelectorAll('.nav-btn'),

    appError: document.getElementById('app-error'),
    appErrorMsg: document.getElementById('app-error-msg'),
    retryLoadBtn: document.getElementById('retry-load-btn'),
    loadingState: document.getElementById('loading-state'),

    theaterSection: document.getElementById('theater-section'),
    theaterTypeBadge: document.getElementById('theater-type-badge'),
    theaterWatchedBadge: document.getElementById('theater-watched-badge'),
    theaterTitle: document.getElementById('theater-title'),
    theaterSubtitle: document.getElementById('theater-subtitle'),
    theaterDetailBtn: document.getElementById('theater-detail-btn'),
    theaterBookmarkBtn: document.getElementById('theater-bookmark-btn'),
    closeTheaterBtn: document.getElementById('close-theater-btn'),
    theaterPlayerShell: document.getElementById('theater-player-shell'),
    playerStage: document.getElementById('player-stage'),

    customControls: document.getElementById('custom-controls'),
    ccPlayBtn: document.getElementById('cc-play-btn'),
    ccSeek: document.getElementById('cc-seek'),
    ccTime: document.getElementById('cc-time'),
    ccMuteBtn: document.getElementById('cc-mute-btn'),
    ccVolume: document.getElementById('cc-volume'),
    ccSpeed: document.getElementById('cc-speed'),
    ccFullscreenBtn: document.getElementById('cc-fullscreen-btn'),

    autoplayBanner: document.getElementById('autoplay-banner'),
    autoplayBannerText: document.getElementById('autoplay-banner-text'),
    autoplayNowBtn: document.getElementById('autoplay-now-btn'),
    autoplayCancelBtn: document.getElementById('autoplay-cancel-btn'),

    episodeNavControls: document.getElementById('episode-nav-controls'),
    prevEpBtn: document.getElementById('prev-ep-btn'),
    nextEpBtn: document.getElementById('next-ep-btn'),
    markWatchedBtn: document.getElementById('mark-watched-btn'),
    autoplayToggle: document.getElementById('autoplay-toggle'),
    trackToggleGroup: document.getElementById('track-toggle-group'),
    trackSubBtn: document.getElementById('track-sub-btn'),
    trackHiBtn: document.getElementById('track-hi-btn'),
    trackNotice: document.getElementById('track-notice'),
    theaterSynopsis: document.getElementById('theater-synopsis'),
    episodePanel: document.getElementById('episode-panel'),
    seasonSelect: document.getElementById('season-select'),
    episodeList: document.getElementById('episode-list'),

    detailView: document.getElementById('detail-view'),
    detailBackBtn: document.getElementById('detail-back-btn'),
    detailThumb: document.getElementById('detail-thumb'),
    detailTypeBadge: document.getElementById('detail-type-badge'),
    detailYearBadge: document.getElementById('detail-year-badge'),
    detailLangBadge: document.getElementById('detail-lang-badge'),
    detailTitle: document.getElementById('detail-title'),
    detailSynopsis: document.getElementById('detail-synopsis'),
    detailGenres: document.getElementById('detail-genres'),
    detailWatchBtn: document.getElementById('detail-watch-btn'),
    detailBookmarkBtn: document.getElementById('detail-bookmark-btn'),
    detailShareBtn: document.getElementById('detail-share-btn'),
    detailShareStatus: document.getElementById('detail-share-status'),
    detailEpisodesWrap: document.getElementById('detail-episodes-wrap'),
    detailTrackToggle: document.getElementById('detail-track-toggle'),
    detailTrackSub: document.getElementById('detail-track-sub'),
    detailTrackHi: document.getElementById('detail-track-hi'),
    detailSeasonSelect: document.getElementById('detail-season-select'),
    detailEpisodeList: document.getElementById('detail-episode-list'),
    detailRelatedSection: document.getElementById('detail-related-section'),
    detailRelatedGrid: document.getElementById('detail-related-grid'),

    browseView: document.getElementById('browse-view'),
    creditsView: document.getElementById('credits-view'),

    heroBanner: document.getElementById('hero-banner'),
    heroBgImg: document.getElementById('hero-bg-img'),
    heroTitle: document.getElementById('hero-title'),
    heroMeta: document.getElementById('hero-meta'),
    heroSynopsis: document.getElementById('hero-synopsis'),
    heroWatchBtn: document.getElementById('hero-watch-btn'),
    heroDetailBtn: document.getElementById('hero-detail-btn'),

    continueSection: document.getElementById('continue-section'),
    continueGrid: document.getElementById('continue-grid'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),

    searchInput: document.getElementById('search-input'),
    randomPickBtn: document.getElementById('random-pick-btn'),
    genreFilter: document.getElementById('genre-filter'),
    languageFilter: document.getElementById('language-filter'),
    tagFilter: document.getElementById('tag-filter'),
    sortFilter: document.getElementById('sort-filter'),
    matureToggle: document.getElementById('mature-toggle'),

    emptyState: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyDesc: document.getElementById('empty-desc'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),

    trendingSection: document.getElementById('trending-section'),
    trendingGrid: document.getElementById('trending-grid'),
    recentSection: document.getElementById('recent-section'),
    recentGrid: document.getElementById('recent-grid'),

    moviesSection: document.getElementById('movies-section'),
    moviesCount: document.getElementById('movies-count'),
    moviesGrid: document.getElementById('movies-grid'),

    showsSection: document.getElementById('shows-section'),
    showsCount: document.getElementById('shows-count'),
    showsGrid: document.getElementById('shows-grid'),

    bookmarksSection: document.getElementById('bookmarks-section'),
    bookmarksCount: document.getElementById('bookmarks-count'),
    bookmarksGrid: document.getElementById('bookmarks-grid'),

    aboutStatement: document.getElementById('about-statement'),
    allowlistList: document.getElementById('allowlist-list'),
    takedownEmailLink: document.getElementById('takedown-email-link')
  };

  /* -------------------------------------------------------
     Storage & Intro Helpers
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

  function setIntroSeen() {
    try {
      localStorage.setItem(STORAGE_INTRO, '1');
    } catch (e) {}
  }

  var introTimer = null;

  function dismissIntro() {
    if (introTimer) {
      clearTimeout(introTimer);
      introTimer = null;
    }
    setIntroSeen();
    if (els.introOverlay) {
      els.introOverlay.classList.add('is-done');
    }
  }

  function setupIntro() {
    if (document.documentElement.classList.contains('skip-intro')) {
      dismissIntro();
      return;
    }
    introTimer = setTimeout(dismissIntro, 2700);
  }

  function replayIntro() {
    if (!els.introOverlay) return;
    document.documentElement.classList.remove('skip-intro');
    els.introOverlay.classList.remove('is-done');
    els.introOverlay.style.display = 'none';
    void els.introOverlay.offsetWidth;
    els.introOverlay.style.display = '';
    if (introTimer) clearTimeout(introTimer);
    introTimer = setTimeout(dismissIntro, 2700);
  }

  /* -------------------------------------------------------
     Utility Helpers
     ------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(sec) {
    var total = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var mm = h > 0 && m < 10 ? '0' + m : String(m);
    var ss = s < 10 ? '0' + s : String(s);
    return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
  }

  function thumbUrl(videoId, quality) {
    return 'https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/' + (quality || 'maxresdefault') + '.jpg';
  }

  function attachThumbFallback(imgEl, videoId) {
    if (!imgEl || !videoId) return;
    imgEl.onerror = function () {
      if (!imgEl.dataset.fallbackTried) {
        imgEl.dataset.fallbackTried = '1';
        imgEl.src = thumbUrl(videoId, 'hqdefault');
      }
    };
    imgEl.onload = function () {
      if (!imgEl.dataset.fallbackTried && imgEl.naturalWidth === 120) {
        imgEl.dataset.fallbackTried = '1';
        imgEl.src = thumbUrl(videoId, 'hqdefault');
      }
    };
  }

  function isChannelAllowed(channelId) {
    return Boolean(channelId && state.allowlistSet.has(channelId));
  }

  function isBookmarked(type, id) {
    return state.bookmarks.some(function (b) {
      return b.type === type && b.id === id;
    });
  }

  function toggleBookmark(type, id) {
    if (isBookmarked(type, id)) {
      state.bookmarks = state.bookmarks.filter(function (b) {
        return !(b.type === type && b.id === id);
      });
    } else {
      state.bookmarks.unshift({ type: type, id: id });
    }
    writeStorage(STORAGE_BOOKMARKS, state.bookmarks);
    updateTheaterBookmarkBtn();
    updateDetailBookmarkBtn();
    renderBrowse();
  }

  function epWatchedKey(showId, seasonNum, epNum) {
    return showId + '|s' + seasonNum + '|e' + epNum;
  }

  function isEpisodeWatched(showId, seasonNum, epNum) {
    return Boolean(state.watched[epWatchedKey(showId, seasonNum, epNum)]);
  }

  function setEpisodeWatched(showId, seasonNum, epNum, value) {
    var key = epWatchedKey(showId, seasonNum, epNum);
    if (value) {
      state.watched[key] = true;
    } else {
      delete state.watched[key];
    }
    writeStorage(STORAGE_WATCHED, state.watched);
  }

  function saveVideoPosition(videoId, seconds) {
    if (!videoId) return;
    if (seconds > 8) {
      state.positions[videoId] = Math.floor(seconds);
    } else {
      delete state.positions[videoId];
    }
    writeStorage(STORAGE_POSITIONS, state.positions);
  }

  function clearVideoPosition(videoId) {
    if (!videoId || !state.positions[videoId]) return;
    delete state.positions[videoId];
    writeStorage(STORAGE_POSITIONS, state.positions);
  }

  function recordHistory(entry) {
    state.history = state.history.filter(function (item) {
      return !(item.type === entry.type && item.id === entry.id);
    });
    state.history.unshift(entry);
    if (state.history.length > 12) {
      state.history = state.history.slice(0, 12);
    }
    writeStorage(STORAGE_HISTORY, state.history);
    renderContinueWatching();
  }

  /* -------------------------------------------------------
     Load Config & Catalog
     ------------------------------------------------------- */
  async function loadJsonFile(url) {
    var response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Could not load ' + url + ' (status ' + response.status + ')');
    }
    try {
      return await response.json();
    } catch (parseErr) {
      throw new Error(url + ' has a JSON formatting mistake. Check commas and quotes.');
    }
  }

  async function initData() {
    els.appError.classList.add('hidden');
    els.loadingState.classList.remove('hidden');

    try {
      var results = await Promise.all([
        loadJsonFile('config.json'),
        loadJsonFile('catalog.json')
      ]);

      state.config = results[0];
      state.catalog = results[1];

      state.allowlistSet = new Set(
        (state.config.allowlistChannels || []).map(function (c) { return c.id; })
      );

      applyConfigToUI();
      populateFilters();
      els.loadingState.classList.add('hidden');
      renderContinueWatching();
      renderBrowse();
      handleRouteFromHash();
    } catch (err) {
      els.loadingState.classList.add('hidden');
      els.appErrorMsg.textContent = err.message || 'Unable to load catalog files.';
      els.appError.classList.remove('hidden');
    }
  }

  function applyConfigToUI() {
    var cfg = state.config || {};
    var name = cfg.siteName || 'Akairis';
    els.siteName.textContent = name;
    els.footerSiteName.textContent = name;
    if (cfg.tagline) {
      els.siteTagline.textContent = cfg.tagline;
    }

    var disc = cfg.disclaimer || {};
    els.aboutStatement.textContent = disc.statement || '';
    var email = disc.takedownEmail || 'takedown@example.com';
    els.takedownEmailLink.textContent = email;
    els.takedownEmailLink.href = 'mailto:' + email;

    els.allowlistList.innerHTML = '';
    (cfg.allowlistChannels || []).forEach(function (ch) {
      var li = document.createElement('li');
      var linkHtml = ch.url
        ? ' — <a class="crimson-link" href="' + escapeHtml(ch.url) + '" target="_blank" rel="noopener noreferrer">Visit Channel ↗</a>'
        : '';
      li.innerHTML =
        '<strong>' + escapeHtml(ch.name) + '</strong> (' + escapeHtml(ch.type || 'official') + ')' + linkHtml;
      els.allowlistList.appendChild(li);
    });
  }

  function getAllowedMovies() {
    return ((state.catalog && state.catalog.movies) || []).filter(function (m) {
      return isChannelAllowed(m.channelId);
    });
  }

  function getAllowedShows() {
    return ((state.catalog && state.catalog.shows) || []).filter(function (s) {
      return (s.seasons || []).some(function (season) {
        var tracks = season.tracks || {};
        var subOk = tracks.sub && isChannelAllowed(tracks.sub.channelId) && (tracks.sub.episodes || []).length > 0;
        var hiOk = tracks.hi && isChannelAllowed(tracks.hi.channelId) && (tracks.hi.episodes || []).length > 0;
        return subOk || hiOk;
      });
    });
  }

  function populateFilters() {
    var genres = new Set();
    var languages = new Set();
    var tags = new Set(['anime-movies']);

    getAllowedMovies().forEach(function (m) {
      (m.genres || []).forEach(function (g) { genres.add(g); });
      if (m.language) languages.add(m.language);
      (m.tags || []).forEach(function (t) { tags.add(t); });
    });

    getAllowedShows().forEach(function (s) {
      (s.genres || []).forEach(function (g) { genres.add(g); });
      (s.tags || []).forEach(function (t) { tags.add(t); });
      (s.seasons || []).forEach(function (season) {
        var tracks = season.tracks || {};
        if (tracks.sub && isChannelAllowed(tracks.sub.channelId)) languages.add('Sub / EN');
        if (tracks.hi && isChannelAllowed(tracks.hi.channelId)) languages.add('Hindi Dub');
      });
    });

    fillSelect(els.genreFilter, 'All Genres', Array.from(genres).sort());
    fillSelect(els.languageFilter, 'All Languages', Array.from(languages).sort());
    fillSelect(els.tagFilter, 'All Categories / Tags', Array.from(tags).sort());
  }

  function fillSelect(selectEl, defaultLabel, items) {
    var current = selectEl.value || 'all';
    selectEl.innerHTML = '<option value="all">' + escapeHtml(defaultLabel) + '</option>';
    items.forEach(function (val) {
      var opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      selectEl.appendChild(opt);
    });
    if (items.indexOf(current) !== -1) {
      selectEl.value = current;
    }
  }

  /* -------------------------------------------------------
     Filtering, Sorting & Hero / Rows
     ------------------------------------------------------- */
  function matchesCommonFilters(item) {
    if (!state.showMature && item.mature === true) return false;
    if (state.genre !== 'all' && (item.genres || []).indexOf(state.genre) === -1) return false;
    if (state.tag !== 'all' && (item.tags || []).indexOf(state.tag) === -1) return false;
    if (state.search.trim()) {
      var q = state.search.trim().toLowerCase();
      var hay = [item.title, item.synopsis, (item.genres || []).join(' '), (item.tags || []).join(' '), item.language || ''].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function matchesMovieFilters(movie) {
    if (!matchesCommonFilters(movie)) return false;
    if (state.language !== 'all' && movie.language !== state.language) return false;
    return true;
  }

  function matchesShowFilters(show) {
    if (!matchesCommonFilters(show)) return false;
    if (state.language !== 'all') {
      var hasLang = (show.seasons || []).some(function (season) {
        var tracks = season.tracks || {};
        if (state.language === 'Sub / EN' || state.language === 'English') {
          return Boolean(tracks.sub && isChannelAllowed(tracks.sub.channelId));
        }
        if (state.language === 'Hindi Dub' || state.language === 'Hindi') {
          return Boolean(tracks.hi && isChannelAllowed(tracks.hi.channelId));
        }
        return false;
      });
      if (!hasLang) return false;
    }
    return true;
  }

  function sortItems(items) {
    var copy = items.slice();
    if (state.sort === 'az') {
      copy.sort(function (a, b) { return String(a.title).localeCompare(String(b.title)); });
    } else if (state.sort === 'year') {
      copy.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
    } else {
      copy.sort(function (a, b) {
        var da = a.addedAt ? Date.parse(a.addedAt) : 0;
        var db = b.addedAt ? Date.parse(b.addedAt) : 0;
        return db - da;
      });
    }
    return copy;
  }

  function getShowPreviewInfo(show) {
    var s0 = (show.seasons || [])[0];
    if (!s0 || !s0.tracks) return { videoId: '', hasSub: false, hasHi: false, epCount: 0 };
    var hasSub = Boolean(s0.tracks.sub && isChannelAllowed(s0.tracks.sub.channelId) && (s0.tracks.sub.episodes || []).length);
    var hasHi = Boolean(s0.tracks.hi && isChannelAllowed(s0.tracks.hi.channelId) && (s0.tracks.hi.episodes || []).length);
    var firstEp = hasSub ? s0.tracks.sub.episodes[0] : (hasHi ? s0.tracks.hi.episodes[0] : null);
    var epCount = hasSub ? s0.tracks.sub.episodes.length : (hasHi ? s0.tracks.hi.episodes.length : 0);
    return {
      videoId: firstEp ? firstEp.videoId : '',
      hasSub: hasSub,
      hasHi: hasHi,
      epCount: epCount
    };
  }

  function renderHero(movies, shows) {
    var isDefaultBrowse =
      state.activeTab === 'all' &&
      !state.search.trim() &&
      state.genre === 'all' &&
      state.language === 'all' &&
      state.tag === 'all';

    if (!isDefaultBrowse || state.detail) {
      els.heroBanner.classList.add('hidden');
      return;
    }

    var pool = movies.map(function (m) { return { type: 'movie', item: m }; })
      .concat(shows.map(function (s) { return { type: 'show', item: s }; }))
      .filter(function (entry) { return state.showMature || !entry.item.mature; });

    if (!pool.length) {
      els.heroBanner.classList.add('hidden');
      return;
    }

    var featured = pool.find(function (e) { return e.item.featured === true; }) || pool[0];
    var videoId = featured.type === 'movie'
      ? featured.item.videoId
      : getShowPreviewInfo(featured.item).videoId;

    els.heroBanner.classList.remove('hidden');
    els.heroTitle.textContent = featured.item.title;
    els.heroMeta.textContent = featured.type === 'movie'
      ? [featured.item.year, featured.item.duration, featured.item.language].filter(Boolean).join(' · ')
      : [featured.item.year, 'Anime Series', (featured.item.genres || []).slice(0, 2).join(', ')].filter(Boolean).join(' · ');
    els.heroSynopsis.textContent = featured.item.synopsis || '';

    els.heroBgImg.dataset.fallbackTried = '';
    els.heroBgImg.src = thumbUrl(videoId, 'maxresdefault');
    attachThumbFallback(els.heroBgImg, videoId);

    els.heroWatchBtn.onclick = function () {
      if (featured.type === 'movie') openMovieInTheater(featured.item.id);
      else openShowInTheater(featured.item.id);
    };
    els.heroDetailBtn.onclick = function () {
      openDetailView(featured.type, featured.item.id);
    };
  }

  function renderSpecialRows(movies, shows) {
    var showRows =
      state.activeTab === 'all' &&
      !state.search.trim() &&
      state.genre === 'all' &&
      state.language === 'all' &&
      state.tag === 'all';

    if (!showRows) {
      els.trendingSection.classList.add('hidden');
      els.recentSection.classList.add('hidden');
      return;
    }

    var allPool = movies.map(function (m) { return { type: 'movie', item: m }; })
      .concat(shows.map(function (s) { return { type: 'show', item: s }; }))
      .filter(function (entry) { return state.showMature || !entry.item.mature; });

    var trending = allPool.filter(function (e) { return e.item.trending === true; });
    if (!trending.length) {
      trending = allPool.slice(0, 3);
    }
    els.trendingGrid.innerHTML = '';
    trending.slice(0, 6).forEach(function (entry) {
      els.trendingGrid.appendChild(entry.type === 'movie' ? createMovieCard(entry.item) : createShowCard(entry.item));
    });
    els.trendingSection.classList.toggle('hidden', trending.length === 0);

    var recent = allPool.slice().sort(function (a, b) {
      var da = a.item.addedAt ? Date.parse(a.item.addedAt) : 0;
      var db = b.item.addedAt ? Date.parse(b.item.addedAt) : 0;
      return db - da;
    });
    els.recentGrid.innerHTML = '';
    recent.slice(0, 3).forEach(function (entry) {
      els.recentGrid.appendChild(entry.type === 'movie' ? createMovieCard(entry.item) : createShowCard(entry.item));
    });
    els.recentSection.classList.toggle('hidden', recent.length === 0);
  }

  function renderBrowse() {
    if (!state.catalog) return;

    var isCredits = state.activeTab === 'credits';
    var isDetail = Boolean(state.detail) && !isCredits;

    els.creditsView.classList.toggle('hidden', !isCredits);
    els.detailView.classList.toggle('hidden', !isDetail);
    els.browseView.classList.toggle('hidden', isCredits || isDetail);

    if (isCredits || isDetail) return;

    var movies = getAllowedMovies();
    var shows = getAllowedShows();

    renderHero(movies, shows);
    renderSpecialRows(movies, shows);

    var filteredMovies = sortItems(movies.filter(matchesMovieFilters));
    var filteredShows = sortItems(shows.filter(matchesShowFilters));

    if (state.activeTab === 'watchlist') {
      els.moviesSection.classList.add('hidden');
      els.showsSection.classList.add('hidden');

      var savedMovies = movies.filter(function (m) {
        return (state.showMature || !m.mature) && isBookmarked('movie', m.id);
      });
      var savedShows = shows.filter(function (s) {
        return (state.showMature || !s.mature) && isBookmarked('show', s.id);
      });

      els.bookmarksGrid.innerHTML = '';
      savedMovies.forEach(function (m) { els.bookmarksGrid.appendChild(createMovieCard(m)); });
      savedShows.forEach(function (s) { els.bookmarksGrid.appendChild(createShowCard(s)); });

      var totalSaved = savedMovies.length + savedShows.length;
      els.bookmarksCount.textContent = String(totalSaved);
      els.bookmarksSection.classList.toggle('hidden', totalSaved === 0);

      if (totalSaved === 0 && state.history.length === 0) {
        els.emptyTitle.textContent = 'Your watchlist is empty';
        els.emptyDesc.textContent = 'Tap ☆ on any movie or anime show to save it here.';
        els.emptyState.classList.remove('hidden');
      } else {
        els.emptyState.classList.add('hidden');
      }
      return;
    }

    els.bookmarksSection.classList.add('hidden');

    var showMoviesSection = state.activeTab === 'all' || state.activeTab === 'movies';
    var showShowsSection = state.activeTab === 'all' || state.activeTab === 'anime';

    els.moviesGrid.innerHTML = '';
    if (showMoviesSection) {
      filteredMovies.forEach(function (m) { els.moviesGrid.appendChild(createMovieCard(m)); });
    }
    els.moviesCount.textContent = String(filteredMovies.length);
    els.moviesSection.classList.toggle('hidden', !showMoviesSection || filteredMovies.length === 0);

    els.showsGrid.innerHTML = '';
    if (showShowsSection) {
      filteredShows.forEach(function (s) { els.showsGrid.appendChild(createShowCard(s)); });
    }
    els.showsCount.textContent = String(filteredShows.length);
    els.showsSection.classList.toggle('hidden', !showShowsSection || filteredShows.length === 0);

    var anyVisible = (showMoviesSection && filteredMovies.length > 0) || (showShowsSection && filteredShows.length > 0);
    if (!anyVisible) {
      els.emptyTitle.textContent = 'No matches found';
      els.emptyDesc.textContent = 'Try clearing your search or changing your filters.';
      els.emptyState.classList.remove('hidden');
    } else {
      els.emptyState.classList.add('hidden');
    }
  }

  function createMovieCard(movie) {
    var card = document.createElement('article');
    card.className = 'media-card';

    var saved = isBookmarked('movie', movie.id);
    var isAnimeMovie = (movie.tags || []).indexOf('anime-movies') !== -1;
    var badgeText = isAnimeMovie ? 'Anime Movie' : 'Movie';

    card.innerHTML =
      '<button class="card-thumb-btn" type="button" aria-label="Watch ' + escapeHtml(movie.title) + '">' +
        '<img alt="' + escapeHtml(movie.title) + ' thumbnail" loading="lazy">' +
        '<span class="card-tag-overlay">' + escapeHtml(badgeText) + '</span>' +
      '</button>' +
      '<div class="card-body">' +
        '<div class="card-title-row">' +
          '<button class="card-title-btn" type="button"><h3 class="card-title">' + escapeHtml(movie.title) + '</h3></button>' +
          '<button class="bookmark-icon-btn ' + (saved ? 'is-saved' : '') + '" type="button" aria-label="Toggle bookmark">' + (saved ? '★' : '☆') + '</button>' +
        '</div>' +
        '<div class="card-meta">' + escapeHtml(movie.year) + ' · ' + escapeHtml(movie.duration || '') + ' · ' + escapeHtml(movie.language || '') + '</div>' +
        '<p class="card-synopsis">' + escapeHtml(movie.synopsis) + '</p>' +
        '<div class="card-footer-row">' +
          '<div class="card-chips">' +
            (movie.genres || []).slice(0, 2).map(function (g) {
              return '<span class="chip">' + escapeHtml(g) + '</span>';
            }).join('') +
          '</div>' +
          '<button class="text-link-btn card-info-btn" type="button">Details →</button>' +
        '</div>' +
      '</div>';

    var img = card.querySelector('img');
    img.src = thumbUrl(movie.videoId, 'maxresdefault');
    attachThumbFallback(img, movie.videoId);

    card.querySelector('.card-thumb-btn').addEventListener('click', function () {
      openMovieInTheater(movie.id);
    });
    card.querySelector('.card-title-btn').addEventListener('click', function () {
      openDetailView('movie', movie.id);
    });
    card.querySelector('.card-info-btn').addEventListener('click', function () {
      openDetailView('movie', movie.id);
    });
    card.querySelector('.bookmark-icon-btn').addEventListener('click', function () {
      toggleBookmark('movie', movie.id);
    });

    return card;
  }

  function createShowCard(show) {
    var card = document.createElement('article');
    card.className = 'media-card';

    var info = getShowPreviewInfo(show);
    var saved = isBookmarked('show', show.id);

    card.innerHTML =
      '<button class="card-thumb-btn" type="button" aria-label="Watch ' + escapeHtml(show.title) + '">' +
        '<img alt="' + escapeHtml(show.title) + ' thumbnail" loading="lazy">' +
        '<span class="card-tag-overlay">Anime · ' + (show.seasons || []).length + ' Season</span>' +
      '</button>' +
      '<div class="card-body">' +
        '<div class="card-title-row">' +
          '<button class="card-title-btn" type="button"><h3 class="card-title">' + escapeHtml(show.title) + '</h3></button>' +
          '<button class="bookmark-icon-btn ' + (saved ? 'is-saved' : '') + '" type="button" aria-label="Toggle bookmark">' + (saved ? '★' : '☆') + '</button>' +
        '</div>' +
        '<div class="card-meta">' + escapeHtml(show.year) + ' · ' + escapeHtml(info.epCount) + ' Ep listed</div>' +
        '<p class="card-synopsis">' + escapeHtml(show.synopsis) + '</p>' +
        '<div class="card-footer-row">' +
          '<div class="card-chips">' +
            (info.hasSub ? '<span class="chip">Sub / EN</span>' : '') +
            (info.hasHi ? '<span class="chip chip-dub">Hindi Dub</span>' : '') +
          '</div>' +
          '<button class="text-link-btn card-info-btn" type="button">Details →</button>' +
        '</div>' +
      '</div>';

    var img = card.querySelector('img');
    if (info.videoId) {
      img.src = thumbUrl(info.videoId, 'maxresdefault');
      attachThumbFallback(img, info.videoId);
    }

    card.querySelector('.card-thumb-btn').addEventListener('click', function () {
      openShowInTheater(show.id);
    });
    card.querySelector('.card-title-btn').addEventListener('click', function () {
      openDetailView('show', show.id);
    });
    card.querySelector('.card-info-btn').addEventListener('click', function () {
      openDetailView('show', show.id);
    });
    card.querySelector('.bookmark-icon-btn').addEventListener('click', function () {
      toggleBookmark('show', show.id);
    });

    return card;
  }

  function renderContinueWatching() {
    if (!state.catalog) return;
    var validHistory = state.history.filter(function (item) {
      if (item.type === 'movie') {
        return getAllowedMovies().some(function (m) {
          return m.id === item.id && (state.showMature || !m.mature);
        });
      }
      return getAllowedShows().some(function (s) {
        return s.id === item.id && (state.showMature || !s.mature);
      });
    });

    els.continueGrid.innerHTML = '';
    els.continueSection.classList.toggle('hidden', validHistory.length === 0);

    validHistory.slice(0, 6).forEach(function (item) {
      var savedSec = state.positions[item.videoId];
      var posText = savedSec ? ' · ' + formatTime(savedSec) : '';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'continue-card';
      btn.innerHTML =
        '<img alt="' + escapeHtml(item.title) + '" loading="lazy">' +
        '<div class="continue-info">' +
          '<h3>' + escapeHtml(item.title) + '</h3>' +
          '<p>' + escapeHtml(item.subtitle + posText) + '</p>' +
        '</div>';

      var img = btn.querySelector('img');
      img.src = thumbUrl(item.videoId, 'hqdefault');

      btn.addEventListener('click', function () {
        if (item.type === 'movie') {
          openMovieInTheater(item.id);
        } else {
          openShowInTheater(item.id, item.seasonIndex || 0, item.track || 'sub', item.ep || 1);
        }
      });

      els.continueGrid.appendChild(btn);
    });
  }

  /* -------------------------------------------------------
     Title Detail View & Shareable Hash Links
     ------------------------------------------------------- */
  function openDetailView(type, id, updateHash) {
    if (updateHash !== false) {
      var targetHash = '#' + type + '/' + id;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }

    var item = type === 'movie'
      ? getAllowedMovies().find(function (m) { return m.id === id; })
      : getAllowedShows().find(function (s) { return s.id === id; });

    if (!item) return;

    state.detail = { type: type, id: id, seasonIndex: 0, track: 'sub' };
    if (state.activeTab === 'credits') {
      state.activeTab = 'all';
      els.navBtns.forEach(function (b) { b.classList.toggle('is-active', b.dataset.tab === 'all'); });
    }
    renderDetailView();
    renderBrowse();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeDetailView(clearHash) {
    state.detail = null;
    if (clearHash && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    renderBrowse();
  }

  function updateDetailBookmarkBtn() {
    if (!state.detail) return;
    var saved = isBookmarked(state.detail.type, state.detail.id);
    els.detailBookmarkBtn.textContent = saved ? '★ Saved' : '☆ Save';
  }

  function renderDetailView() {
    if (!state.detail) return;
    var d = state.detail;
    var item = d.type === 'movie'
      ? getAllowedMovies().find(function (m) { return m.id === d.id; })
      : getAllowedShows().find(function (s) { return s.id === d.id; });

    if (!item) return;

    var videoId = d.type === 'movie' ? item.videoId : getShowPreviewInfo(item).videoId;
    els.detailThumb.dataset.fallbackTried = '';
    els.detailThumb.src = thumbUrl(videoId, 'maxresdefault');
    attachThumbFallback(els.detailThumb, videoId);

    els.detailTypeBadge.textContent = d.type === 'movie'
      ? ((item.tags || []).indexOf('anime-movies') !== -1 ? 'Anime Movie' : 'Movie')
      : 'Anime Series';
    els.detailYearBadge.textContent = item.year ? String(item.year) : '';
    els.detailLangBadge.textContent = d.type === 'movie'
      ? (item.language || 'Official')
      : (getShowPreviewInfo(item).hasHi ? 'Sub / EN & Hindi Dub' : 'Sub / EN');
    els.detailTitle.textContent = item.title;
    els.detailSynopsis.textContent = item.synopsis || '';
    els.detailShareStatus.classList.add('hidden');

    els.detailGenres.innerHTML = (item.genres || []).map(function (g) {
      return '<span class="chip">' + escapeHtml(g) + '</span>';
    }).join('');

    updateDetailBookmarkBtn();

    els.detailWatchBtn.onclick = function () {
      if (d.type === 'movie') {
        openMovieInTheater(item.id);
      } else {
        openShowInTheater(item.id, d.seasonIndex, d.track);
      }
    };

    if (d.type === 'show') {
      renderDetailEpisodes(item);
    } else {
      els.detailEpisodesWrap.classList.add('hidden');
    }

    renderRelatedTitles(d.type, item);
  }

  function renderDetailEpisodes(show) {
    els.detailEpisodesWrap.classList.remove('hidden');
    var season = show.seasons[state.detail.seasonIndex] || show.seasons[0];
    state.detail.track = chooseAvailableTrack(season, state.detail.track);

    els.detailSeasonSelect.innerHTML = '';
    show.seasons.forEach(function (s, idx) {
      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = s.title || ('Season ' + s.seasonNumber);
      els.detailSeasonSelect.appendChild(opt);
    });
    els.detailSeasonSelect.value = String(state.detail.seasonIndex);

    var hasSub = getTrackEpisodes(season, 'sub').length > 0;
    var hasHi = getTrackEpisodes(season, 'hi').length > 0;
    els.detailTrackToggle.classList.toggle('hidden', !(hasSub && hasHi));
    els.detailTrackSub.classList.toggle('is-active', state.detail.track === 'sub');
    els.detailTrackHi.classList.toggle('is-active', state.detail.track === 'hi');

    var episodes = getTrackEpisodes(season, state.detail.track);
    els.detailEpisodeList.innerHTML = '';
    episodes.forEach(function (ep) {
      var watched = isEpisodeWatched(show.id, season.seasonNumber, ep.ep);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ep-btn';
      btn.innerHTML =
        '<div class="ep-btn-top">' +
          '<span class="ep-num">Episode ' + escapeHtml(ep.ep) + (ep.duration ? ' · ' + escapeHtml(ep.duration) : '') + '</span>' +
          (watched ? '<span class="ep-watched-tag">✓ Watched</span>' : '') +
        '</div>' +
        '<span class="ep-title">' + escapeHtml(ep.title) + '</span>';
      btn.addEventListener('click', function () {
        openShowInTheater(show.id, state.detail.seasonIndex, state.detail.track, ep.ep);
      });
      els.detailEpisodeList.appendChild(btn);
    });
  }

  function renderRelatedTitles(currentType, currentItem) {
    var genres = currentItem.genres || [];
    var pool = getAllowedMovies().map(function (m) { return { type: 'movie', item: m }; })
      .concat(getAllowedShows().map(function (s) { return { type: 'show', item: s }; }))
      .filter(function (entry) {
        if (entry.type === currentType && entry.item.id === currentItem.id) return false;
        if (!state.showMature && entry.item.mature) return false;
        return (entry.item.genres || []).some(function (g) { return genres.indexOf(g) !== -1; });
      });

    els.detailRelatedGrid.innerHTML = '';
    pool.slice(0, 3).forEach(function (entry) {
      els.detailRelatedGrid.appendChild(entry.type === 'movie' ? createMovieCard(entry.item) : createShowCard(entry.item));
    });
    els.detailRelatedSection.classList.toggle('hidden', pool.length === 0);
  }

  function handleRouteFromHash() {
    var hash = window.location.hash || '';
    var match = hash.match(/^#(movie|show)\/([a-zA-Z0-9_-]+)$/);
    if (match) {
      openDetailView(match[1], match[2], false);
    } else if (state.detail) {
      state.detail = null;
      renderBrowse();
    }
  }

  /* -------------------------------------------------------
     Theater Player & Option A Custom Crimson Controls
     ------------------------------------------------------- */
  function cancelAutoplayCountdown() {
    if (state.autoplayTimer) {
      clearInterval(state.autoplayTimer);
      state.autoplayTimer = null;
    }
    els.autoplayBanner.classList.add('hidden');
  }

  function stopProgressPolling() {
    if (state.progressTimer) {
      clearInterval(state.progressTimer);
      state.progressTimer = null;
    }
  }

  function destroyActivePlayer() {
    cancelAutoplayCountdown();
    stopProgressPolling();
    if (state.ytPlayerInstance && typeof state.ytPlayerInstance.destroy === 'function') {
      try { state.ytPlayerInstance.destroy(); } catch (e) {}
    }
    state.ytPlayerInstance = null;
    els.playerStage.innerHTML = '';
    els.customControls.classList.add('hidden');
    els.ccPlayBtn.textContent = '▶';
    els.ccSeek.value = '0';
    els.ccTime.textContent = '0:00 / 0:00';
  }

  function closeTheater() {
    destroyActivePlayer();
    state.theater = null;
    els.theaterSection.classList.add('hidden');
  }

  function openMovieInTheater(movieId) {
    var movie = getAllowedMovies().find(function (m) { return m.id === movieId; });
    if (!movie) return;

    state.detail = null;
    switchTab(state.activeTab === 'credits' ? 'all' : state.activeTab);
    state.theater = { type: 'movie', id: movie.id };
    renderTheater();
    els.theaterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openShowInTheater(showId, seasonIndex, preferredTrack, preferredEp) {
    var show = getAllowedShows().find(function (s) { return s.id === showId; });
    if (!show) return;

    state.detail = null;
    switchTab(state.activeTab === 'credits' ? 'all' : state.activeTab);

    var sIdx = typeof seasonIndex === 'number' && show.seasons[seasonIndex] ? seasonIndex : 0;
    var season = show.seasons[sIdx];
    var track = chooseAvailableTrack(season, preferredTrack);
    var episodes = getTrackEpisodes(season, track);
    var epObj = episodes.find(function (e) { return e.ep === preferredEp; }) || episodes[0];

    state.theater = {
      type: 'show',
      id: show.id,
      seasonIndex: sIdx,
      track: track,
      epNumber: epObj ? epObj.ep : 1,
      notice: ''
    };

    renderTheater();
    els.theaterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function chooseAvailableTrack(season, preferred) {
    var tracks = (season && season.tracks) || {};
    var hasSub = Boolean(tracks.sub && isChannelAllowed(tracks.sub.channelId) && (tracks.sub.episodes || []).length);
    var hasHi = Boolean(tracks.hi && isChannelAllowed(tracks.hi.channelId) && (tracks.hi.episodes || []).length);
    if (preferred === 'hi' && hasHi) return 'hi';
    if (preferred === 'sub' && hasSub) return 'sub';
    return hasSub ? 'sub' : 'hi';
  }

  function getTrackEpisodes(season, trackKey) {
    var trackObj = season && season.tracks && season.tracks[trackKey];
    if (!trackObj || !isChannelAllowed(trackObj.channelId)) return [];
    return trackObj.episodes || [];
  }

  function updateTheaterBookmarkBtn() {
    if (!state.theater) return;
    var saved = isBookmarked(state.theater.type, state.theater.id);
    els.theaterBookmarkBtn.textContent = saved ? '★ Saved' : '☆ Save';
  }

  function renderTheater() {
    if (!state.theater) return;
    destroyActivePlayer();
    els.theaterSection.classList.remove('hidden');
    els.trackNotice.classList.add('hidden');
    els.trackNotice.textContent = '';

    if (state.theater.type === 'movie') {
      var movie = getAllowedMovies().find(function (m) { return m.id === state.theater.id; });
      if (!movie) return;

      els.theaterTypeBadge.textContent = (movie.tags || []).indexOf('anime-movies') !== -1 ? 'Anime Movie' : 'Movie';
      els.theaterWatchedBadge.classList.add('hidden');
      els.theaterTitle.textContent = movie.title;
      els.theaterSubtitle.textContent = [movie.year, movie.duration, movie.language].filter(Boolean).join(' · ');
      els.theaterSynopsis.textContent = movie.synopsis || '';

      els.episodeNavControls.classList.add('hidden');
      els.trackToggleGroup.classList.add('hidden');
      els.episodePanel.classList.add('hidden');

      updateTheaterBookmarkBtn();
      renderPlayerPreview(movie.videoId, movie.title, movie.embeddable !== false);

      recordHistory({
        type: 'movie',
        id: movie.id,
        title: movie.title,
        subtitle: 'Movie · ' + (movie.language || 'Official'),
        videoId: movie.videoId,
        updatedAt: Date.now()
      });
      return;
    }

    var show = getAllowedShows().find(function (s) { return s.id === state.theater.id; });
    if (!show) return;

    var season = show.seasons[state.theater.seasonIndex] || show.seasons[0];
    var trackKey = chooseAvailableTrack(season, state.theater.track);
    state.theater.track = trackKey;

    var trackObj = season.tracks[trackKey];
    var episodes = getTrackEpisodes(season, trackKey);
    var epIndex = episodes.findIndex(function (e) { return e.ep === state.theater.epNumber; });
    if (epIndex === -1) {
      epIndex = 0;
      state.theater.epNumber = episodes[0] ? episodes[0].ep : 1;
    }
    var currentEp = episodes[epIndex];
    if (!currentEp) return;

    var watched = isEpisodeWatched(show.id, season.seasonNumber, currentEp.ep);
    var hasSub = getTrackEpisodes(season, 'sub').length > 0;
    var hasHi = getTrackEpisodes(season, 'hi').length > 0;

    els.theaterTypeBadge.textContent = 'Anime Series';
    els.theaterWatchedBadge.classList.toggle('hidden', !watched);
    els.theaterTitle.textContent = show.title;
    els.theaterSubtitle.textContent =
      (season.title || ('Season ' + season.seasonNumber)) +
      ' · Episode ' + currentEp.ep + ': ' + currentEp.title +
      ' (' + (trackObj.label || trackKey) + ')';
    els.theaterSynopsis.textContent = show.synopsis || '';

    els.episodeNavControls.classList.remove('hidden');
    els.prevEpBtn.disabled = epIndex <= 0;
    els.nextEpBtn.disabled = epIndex >= episodes.length - 1;
    els.markWatchedBtn.textContent = watched ? '✓ Watched' : '✓ Mark Watched';

    if (hasSub && hasHi) {
      els.trackToggleGroup.classList.remove('hidden');
      els.trackSubBtn.classList.toggle('is-active', trackKey === 'sub');
      els.trackHiBtn.classList.toggle('is-active', trackKey === 'hi');
    } else {
      els.trackToggleGroup.classList.add('hidden');
    }

    if (state.theater.notice) {
      els.trackNotice.textContent = state.theater.notice;
      els.trackNotice.classList.remove('hidden');
    }

    els.episodePanel.classList.remove('hidden');
    els.seasonSelect.innerHTML = '';
    show.seasons.forEach(function (s, idx) {
      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = s.title || ('Season ' + s.seasonNumber);
      els.seasonSelect.appendChild(opt);
    });
    els.seasonSelect.value = String(state.theater.seasonIndex);

    els.episodeList.innerHTML = '';
    episodes.forEach(function (ep) {
      var epDone = isEpisodeWatched(show.id, season.seasonNumber, ep.ep);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ep-btn' + (ep.ep === currentEp.ep ? ' is-active' : '');
      btn.innerHTML =
        '<div class="ep-btn-top">' +
          '<span class="ep-num">Episode ' + escapeHtml(ep.ep) + (ep.duration ? ' · ' + escapeHtml(ep.duration) : '') + '</span>' +
          (epDone ? '<span class="ep-watched-tag">✓ Watched</span>' : '') +
        '</div>' +
        '<span class="ep-title">' + escapeHtml(ep.title) + '</span>';
      btn.addEventListener('click', function () {
        state.theater.epNumber = ep.ep;
        state.theater.notice = '';
        renderTheater();
      });
      els.episodeList.appendChild(btn);
    });

    updateTheaterBookmarkBtn();
    renderPlayerPreview(currentEp.videoId, show.title + ' Episode ' + currentEp.ep, currentEp.embeddable !== false);

    recordHistory({
      type: 'show',
      id: show.id,
      seasonIndex: state.theater.seasonIndex,
      track: trackKey,
      ep: currentEp.ep,
      title: show.title,
      subtitle: 'S' + season.seasonNumber + ' · Ep ' + currentEp.ep + ' (' + (trackObj.label || trackKey) + ')',
      videoId: currentEp.videoId,
      updatedAt: Date.now()
    });
  }

  function renderPlayerPreview(videoId, label, embeddable) {
    if (!videoId || !embeddable) {
      renderUnavailableStage(videoId, 'This video is currently unavailable or embedding is disabled by the rights holder.');
      return;
    }

    var savedSec = state.positions[videoId] || 0;
    var wrap = document.createElement('div');
    wrap.className = 'thumb-loader';

    var buttonsHtml = savedSec >= 10
      ? '<button class="btn btn-primary thumb-resume-btn" type="button">▶ Resume from ' + escapeHtml(formatTime(savedSec)) + '</button>' +
        '<button class="btn btn-secondary thumb-start-btn" type="button">↺ Start Over</button>'
      : '<button class="btn btn-primary thumb-start-btn" type="button">▶ Play Video</button>';

    wrap.innerHTML =
      '<img alt="' + escapeHtml(label) + ' preview thumbnail">' +
      '<div class="thumb-play-overlay">' +
        '<button class="play-circle-btn" type="button" aria-label="Play ' + escapeHtml(label) + '">▶</button>' +
        '<div class="thumb-action-row">' + buttonsHtml + '</div>' +
      '</div>';

    var img = wrap.querySelector('img');
    img.src = thumbUrl(videoId, 'maxresdefault');
    attachThumbFallback(img, videoId);

    wrap.querySelector('.play-circle-btn').addEventListener('click', function () {
      mountYouTubePlayer(videoId, label, savedSec >= 10 ? savedSec : 0);
    });
    var resumeBtn = wrap.querySelector('.thumb-resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', function () {
        mountYouTubePlayer(videoId, label, savedSec);
      });
    }
    wrap.querySelector('.thumb-start-btn').addEventListener('click', function () {
      clearVideoPosition(videoId);
      mountYouTubePlayer(videoId, label, 0);
    });

    els.playerStage.appendChild(wrap);
  }

  function renderUnavailableStage(videoId, message) {
    destroyActivePlayer();
    var watchUrl = videoId
      ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId)
      : 'https://www.youtube.com';

    els.playerStage.innerHTML =
      '<div class="player-unavailable">' +
        '<p>' + escapeHtml(message) + '</p>' +
        '<a class="btn btn-primary" href="' + watchUrl + '" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>' +
      '</div>';
  }

  function ensureYouTubeApi() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve(window.YT);
    }
    if (state.ytApiPromise) return state.ytApiPromise;

    state.ytApiPromise = new Promise(function (resolve, reject) {
      var timeoutId = setTimeout(function () {
        reject(new Error('YouTube API timed out'));
      }, 3500);

      var prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        clearTimeout(timeoutId);
        if (typeof prevReady === 'function') prevReady();
        resolve(window.YT);
      };

      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = function () {
        clearTimeout(timeoutId);
        reject(new Error('YouTube API script blocked'));
      };
      document.head.appendChild(tag);
    });

    return state.ytApiPromise;
  }

  function mountYouTubePlayer(videoId, label, startSeconds) {
    destroyActivePlayer();
    var mountDiv = document.createElement('div');
    mountDiv.id = 'yt-player-mount';
    els.playerStage.appendChild(mountDiv);

    ensureYouTubeApi().then(function (YT) {
      if (!document.getElementById('yt-player-mount')) return;

      els.customControls.classList.remove('hidden');
      state.lastSavedSec = 0;

      state.ytPlayerInstance = new YT.Player('yt-player-mount', {
        host: 'https://www.youtube-nocookie.com',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          start: startSeconds > 0 ? Math.floor(startSeconds) : 0
        },
        events: {
          onReady: function (e) {
            var player = e.target;
            try {
              player.setVolume(Number(els.ccVolume.value) || 100);
              player.setPlaybackRate(Number(els.ccSpeed.value) || 1);
            } catch (err) {}
            startProgressPolling(videoId);
          },
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.PLAYING) {
              els.ccPlayBtn.textContent = '⏸';
              cancelAutoplayCountdown();
            } else if (e.data === YT.PlayerState.PAUSED) {
              els.ccPlayBtn.textContent = '▶';
              try {
                saveVideoPosition(videoId, state.ytPlayerInstance.getCurrentTime());
                renderContinueWatching();
              } catch (err) {}
            } else if (e.data === YT.PlayerState.ENDED) {
              els.ccPlayBtn.textContent = '▶';
              clearVideoPosition(videoId);
              handlePlaybackEnded();
            }
          },
          onError: function () {
            renderUnavailableStage(
              videoId,
              'This video cannot be played inside an embed (it may be region-restricted, private, or have embedding disabled).'
            );
          }
        }
      });
    }).catch(function () {
      els.customControls.classList.add('hidden');
      var startParam = startSeconds > 0 ? '&start=' + Math.floor(startSeconds) : '';
      els.playerStage.innerHTML =
        '<iframe ' +
          'src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0&iv_load_policy=3' + startParam + '" ' +
          'title="' + escapeHtml(label) + '" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
          'referrerpolicy="strict-origin-when-cross-origin" ' +
          'allowfullscreen>' +
        '</iframe>';
    });
  }

  function startProgressPolling(videoId) {
    stopProgressPolling();
    state.progressTimer = setInterval(function () {
      var p = state.ytPlayerInstance;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      try {
        var cur = p.getCurrentTime() || 0;
        var dur = p.getDuration() || 0;

        if (dur > 0 && !state.isSeeking) {
          els.ccSeek.value = String(Math.round((cur / dur) * 1000));
          els.ccTime.textContent = formatTime(cur) + ' / ' + formatTime(dur);

          if (Math.abs(cur - state.lastSavedSec) >= 3) {
            state.lastSavedSec = cur;
            if (cur < dur - 12) {
              saveVideoPosition(videoId, cur);
            } else {
              clearVideoPosition(videoId);
            }
          }
        }
      } catch (e) {}
    }, 450);
  }

  function handlePlaybackEnded() {
    if (!state.theater || state.theater.type !== 'show') return;
    var show = getAllowedShows().find(function (s) { return s.id === state.theater.id; });
    if (!show) return;
    var season = show.seasons[state.theater.seasonIndex];
    var episodes = getTrackEpisodes(season, state.theater.track);

    setEpisodeWatched(show.id, season.seasonNumber, state.theater.epNumber, true);
    els.theaterWatchedBadge.classList.remove('hidden');
    els.markWatchedBtn.textContent = '✓ Watched';

    var idx = episodes.findIndex(function (e) { return e.ep === state.theater.epNumber; });
    var nextEp = episodes[idx + 1];

    if (nextEp && els.autoplayToggle.checked) {
      startAutoplayCountdown(nextEp);
    }
  }

  function startAutoplayCountdown(nextEp) {
    cancelAutoplayCountdown();
    state.autoplaySeconds = 5;
    els.autoplayBannerText.textContent = 'Up next: Episode ' + nextEp.ep + ' in ' + state.autoplaySeconds + 's...';
    els.autoplayBanner.classList.remove('hidden');

    state.autoplayTimer = setInterval(function () {
      state.autoplaySeconds -= 1;
      if (state.autoplaySeconds <= 0) {
        cancelAutoplayCountdown();
        playNextEpisodeImmediately();
      } else {
        els.autoplayBannerText.textContent = 'Up next: Episode ' + nextEp.ep + ' in ' + state.autoplaySeconds + 's...';
      }
    }, 1000);
  }

  function playNextEpisodeImmediately() {
    if (!state.theater || state.theater.type !== 'show') return;
    var show = getAllowedShows().find(function (s) { return s.id === state.theater.id; });
    if (!show) return;
    var season = show.seasons[state.theater.seasonIndex];
    var episodes = getTrackEpisodes(season, state.theater.track);
    var idx = episodes.findIndex(function (e) { return e.ep === state.theater.epNumber; });
    var nextEp = episodes[idx + 1];
    if (!nextEp) return;
    state.theater.epNumber = nextEp.ep;
    state.theater.notice = '';
    renderTheater();
    mountYouTubePlayer(nextEp.videoId, show.title + ' Episode ' + nextEp.ep, 0);
  }

  function switchTrack(targetTrack) {
    if (!state.theater || state.theater.type !== 'show') return;
    var show = getAllowedShows().find(function (s) { return s.id === state.theater.id; });
    if (!show) return;
    var season = show.seasons[state.theater.seasonIndex];
    var targetEpisodes = getTrackEpisodes(season, targetTrack);
    if (!targetEpisodes.length) return;

    var sameEp = targetEpisodes.find(function (e) { return e.ep === state.theater.epNumber; });
    if (sameEp) {
      state.theater.track = targetTrack;
      state.theater.notice = '';
    } else {
      var fallbackEp = targetEpisodes[0];
      state.theater.notice =
        'Episode ' + state.theater.epNumber + ' is not listed in ' +
        (targetTrack === 'hi' ? 'Hindi Dub' : 'Sub / EN') +
        ' yet — switched to Episode ' + fallbackEp.ep + '.';
      state.theater.track = targetTrack;
      state.theater.epNumber = fallbackEp.ep;
    }
    renderTheater();
  }

  function stepEpisode(delta) {
    if (!state.theater || state.theater.type !== 'show') return;
    var show = getAllowedShows().find(function (s) { return s.id === state.theater.id; });
    if (!show) return;
    var season = show.seasons[state.theater.seasonIndex];
    var episodes = getTrackEpisodes(season, state.theater.track);
    var idx = episodes.findIndex(function (e) { return e.ep === state.theater.epNumber; });
    var next = episodes[idx + delta];
    if (!next) return;
    state.theater.epNumber = next.ep;
    state.theater.notice = '';
    renderTheater();
  }

  function toggleFullscreenShell() {
    var shell = els.theaterPlayerShell;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
      return;
    }
    if (shell.requestFullscreen) {
      shell.requestFullscreen().catch(function () {
        shell.classList.toggle('is-pseudo-fullscreen');
      });
    } else {
      shell.classList.toggle('is-pseudo-fullscreen');
    }
  }

  /* -------------------------------------------------------
     Navigation & Events
     ------------------------------------------------------- */
  function switchTab(tab) {
    state.activeTab = tab;
    state.detail = null;
    if (window.location.hash && tab !== 'credits') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    els.navBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
    if (tab === 'credits') {
      closeTheater();
    }
    renderBrowse();
  }

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
      switchTab('all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    els.footerCreditsBtn.addEventListener('click', function () {
      switchTab('credits');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    els.retryLoadBtn.addEventListener('click', initData);
    els.closeTheaterBtn.addEventListener('click', closeTheater);

    els.theaterDetailBtn.addEventListener('click', function () {
      if (!state.theater) return;
      openDetailView(state.theater.type, state.theater.id);
    });

    els.theaterBookmarkBtn.addEventListener('click', function () {
      if (!state.theater) return;
      toggleBookmark(state.theater.type, state.theater.id);
    });

    els.prevEpBtn.addEventListener('click', function () { stepEpisode(-1); });
    els.nextEpBtn.addEventListener('click', function () { stepEpisode(1); });

    els.markWatchedBtn.addEventListener('click', function () {
      if (!state.theater || state.theater.type !== 'show') return;
      var show = getAllowedShows().find(function (s) { return s.id === state.theater.id; });
      if (!show) return;
      var season = show.seasons[state.theater.seasonIndex];
      var currently = isEpisodeWatched(show.id, season.seasonNumber, state.theater.epNumber);
      setEpisodeWatched(show.id, season.seasonNumber, state.theater.epNumber, !currently);
      renderTheater();
    });

    els.autoplayNowBtn.addEventListener('click', function () {
      cancelAutoplayCountdown();
      playNextEpisodeImmediately();
    });
    els.autoplayCancelBtn.addEventListener('click', cancelAutoplayCountdown);

    els.trackSubBtn.addEventListener('click', function () { switchTrack('sub'); });
    els.trackHiBtn.addEventListener('click', function () { switchTrack('hi'); });

    els.seasonSelect.addEventListener('change', function () {
      if (!state.theater || state.theater.type !== 'show') return;
      var newIdx = Number(els.seasonSelect.value) || 0;
      var show = getAllowedShows().find(function (s) { return s.id === state.theater.id; });
      if (!show || !show.seasons[newIdx]) return;
      state.theater.seasonIndex = newIdx;
      state.theater.track = chooseAvailableTrack(show.seasons[newIdx], state.theater.track);
      var eps = getTrackEpisodes(show.seasons[newIdx], state.theater.track);
      state.theater.epNumber = eps[0] ? eps[0].ep : 1;
      state.theater.notice = '';
      renderTheater();
    });

    /* Custom Control Bar Listeners */
    els.ccPlayBtn.addEventListener('click', function () {
      var p = state.ytPlayerInstance;
      if (!p || typeof p.getPlayerState !== 'function') return;
      if (p.getPlayerState() === 1) p.pauseVideo();
      else p.playVideo();
    });

    els.ccSeek.addEventListener('input', function () {
      state.isSeeking = true;
    });
    els.ccSeek.addEventListener('change', function () {
      state.isSeeking = false;
      var p = state.ytPlayerInstance;
      if (!p || typeof p.getDuration !== 'function') return;
      var dur = p.getDuration() || 0;
      if (dur > 0) {
        p.seekTo((Number(els.ccSeek.value) / 1000) * dur, true);
      }
    });

    els.ccMuteBtn.addEventListener('click', function () {
      var p = state.ytPlayerInstance;
      if (!p || typeof p.isMuted !== 'function') return;
      if (p.isMuted()) {
        p.unMute();
        els.ccMuteBtn.textContent = '🔊';
      } else {
        p.mute();
        els.ccMuteBtn.textContent = '🔇';
      }
    });

    els.ccVolume.addEventListener('input', function () {
      var p = state.ytPlayerInstance;
      var vol = Number(els.ccVolume.value);
      if (!p || typeof p.setVolume !== 'function') return;
      p.setVolume(vol);
      if (vol === 0) {
        p.mute();
        els.ccMuteBtn.textContent = '🔇';
      } else {
        p.unMute();
        els.ccMuteBtn.textContent = '🔊';
      }
    });

    els.ccSpeed.addEventListener('change', function () {
      var p = state.ytPlayerInstance;
      if (!p || typeof p.setPlaybackRate !== 'function') return;
      p.setPlaybackRate(Number(els.ccSpeed.value) || 1);
    });

    els.ccFullscreenBtn.addEventListener('click', toggleFullscreenShell);

    /* Detail View Listeners */
    els.detailBackBtn.addEventListener('click', function () {
      closeDetailView(true);
    });
    els.detailBookmarkBtn.addEventListener('click', function () {
      if (!state.detail) return;
      toggleBookmark(state.detail.type, state.detail.id);
    });
    els.detailShareBtn.addEventListener('click', function () {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          els.detailShareStatus.textContent = 'Share link copied!';
          els.detailShareStatus.classList.remove('hidden');
        }).catch(function () {
          window.prompt('Copy this share link:', url);
        });
      } else {
        window.prompt('Copy this share link:', url);
      }
    });
    els.detailSeasonSelect.addEventListener('change', function () {
      if (!state.detail) return;
      state.detail.seasonIndex = Number(els.detailSeasonSelect.value) || 0;
      renderDetailView();
    });
    els.detailTrackSub.addEventListener('click', function () {
      if (!state.detail) return;
      state.detail.track = 'sub';
      renderDetailView();
    });
    els.detailTrackHi.addEventListener('click', function () {
      if (!state.detail) return;
      state.detail.track = 'hi';
      renderDetailView();
    });

    /* Search, Filters, Sort & Random Pick */
    els.searchInput.addEventListener('input', function () {
      state.search = els.searchInput.value;
      renderBrowse();
    });
    els.genreFilter.addEventListener('change', function () {
      state.genre = els.genreFilter.value;
      renderBrowse();
    });
    els.languageFilter.addEventListener('change', function () {
      state.language = els.languageFilter.value;
      renderBrowse();
    });
    els.tagFilter.addEventListener('change', function () {
      state.tag = els.tagFilter.value;
      renderBrowse();
    });
    els.sortFilter.addEventListener('change', function () {
      state.sort = els.sortFilter.value;
      renderBrowse();
    });
    els.matureToggle.addEventListener('change', function () {
      state.showMature = els.matureToggle.checked;
      renderContinueWatching();
      renderBrowse();
    });

    els.randomPickBtn.addEventListener('click', function () {
      var pool = getAllowedMovies().map(function (m) { return { type: 'movie', item: m }; })
        .concat(getAllowedShows().map(function (s) { return { type: 'show', item: s }; }))
        .filter(function (e) { return state.showMature || !e.item.mature; });
      if (!pool.length) return;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.type === 'movie') openMovieInTheater(pick.item.id);
      else openShowInTheater(pick.item.id);
    });

    els.resetFiltersBtn.addEventListener('click', function () {
      state.search = '';
      state.genre = 'all';
      state.language = 'all';
      state.tag = 'all';
      els.searchInput.value = '';
      els.genreFilter.value = 'all';
      els.languageFilter.value = 'all';
      els.tagFilter.value = 'all';
      renderBrowse();
    });

    els.clearHistoryBtn.addEventListener('click', function () {
      state.history = [];
      writeStorage(STORAGE_HISTORY, []);
      renderContinueWatching();
      renderBrowse();
    });

    window.addEventListener('hashchange', handleRouteFromHash);
  }

  state.bookmarks = readStorage(STORAGE_BOOKMARKS, []);
  state.history = readStorage(STORAGE_HISTORY, []);
  state.positions = readStorage(STORAGE_POSITIONS, {});
  state.watched = readStorage(STORAGE_WATCHED, {});

  setupIntro();
  bindEvents();
  initData();
})();
