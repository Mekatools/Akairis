(function () {
  'use strict';

  var STORAGE_INTRO = 'akairis_intro_seen';
  var STORAGE_BOOKMARKS = 'akairis_bookmarks';
  var STORAGE_HISTORY = 'akairis_history';

  var state = {
    config: null,
    catalog: null,
    allowlistSet: new Set(),
    activeTab: 'all',
    search: '',
    genre: 'all',
    language: 'all',
    tag: 'all',
    showMature: false,
    bookmarks: [],
    history: [],
    theater: null, // { type: 'movie'|'show', id, seasonIndex, track, epNumber, playerLoaded }
    ytApiPromise: null,
    ytPlayerInstance: null
  };

  var els = {
    introOverlay: document.getElementById('intro-overlay'),
    skipIntroBtn: document.getElementById('skip-intro-btn'),
    replayIntroBtn: document.getElementById('replay-intro-btn'),
    siteName: document.getElementById('site-name'),
    siteTagline: document.getElementById('site-tagline'),
    footerSiteName: document.getElementById('footer-site-name'),
    brandHomeLink: document.getElementById('brand-home-link'),
    footerAboutBtn: document.getElementById('footer-about-btn'),
    navBtns: document.querySelectorAll('.nav-btn'),

    appError: document.getElementById('app-error'),
    appErrorMsg: document.getElementById('app-error-msg'),
    retryLoadBtn: document.getElementById('retry-load-btn'),

    theaterSection: document.getElementById('theater-section'),
    theaterTypeBadge: document.getElementById('theater-type-badge'),
    theaterChannelBadge: document.getElementById('theater-channel-badge'),
    theaterTitle: document.getElementById('theater-title'),
    theaterSubtitle: document.getElementById('theater-subtitle'),
    theaterBookmarkBtn: document.getElementById('theater-bookmark-btn'),
    closeTheaterBtn: document.getElementById('close-theater-btn'),
    playerStage: document.getElementById('player-stage'),
    episodeNavControls: document.getElementById('episode-nav-controls'),
    prevEpBtn: document.getElementById('prev-ep-btn'),
    nextEpBtn: document.getElementById('next-ep-btn'),
    trackToggleGroup: document.getElementById('track-toggle-group'),
    trackSubBtn: document.getElementById('track-sub-btn'),
    trackHiBtn: document.getElementById('track-hi-btn'),
    watchYtLink: document.getElementById('watch-yt-link'),
    trackNotice: document.getElementById('track-notice'),
    theaterSynopsis: document.getElementById('theater-synopsis'),
    episodePanel: document.getElementById('episode-panel'),
    seasonSelect: document.getElementById('season-select'),
    episodeList: document.getElementById('episode-list'),

    browseView: document.getElementById('browse-view'),
    aboutView: document.getElementById('about-view'),
    continueSection: document.getElementById('continue-section'),
    continueGrid: document.getElementById('continue-grid'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),

    searchInput: document.getElementById('search-input'),
    genreFilter: document.getElementById('genre-filter'),
    languageFilter: document.getElementById('language-filter'),
    tagFilter: document.getElementById('tag-filter'),
    matureToggle: document.getElementById('mature-toggle'),

    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyDesc: document.getElementById('empty-desc'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),

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
     Safe Storage Helpers
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

  /* -------------------------------------------------------
     Intro Animation Controller (max 2.8s, non-blocking)
     ------------------------------------------------------- */
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
    var skipClass = document.documentElement.classList.contains('skip-intro');
    if (skipClass) {
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
    if (!channelId) return false;
    return state.allowlistSet.has(channelId);
  }

  function isBookmarked(type, id) {
    return state.bookmarks.some(function (b) {
      return b.type === type && b.id === id;
    });
  }

  function toggleBookmark(type, id) {
    var exists = isBookmarked(type, id);
    if (exists) {
      state.bookmarks = state.bookmarks.filter(function (b) {
        return !(b.type === type && b.id === id);
      });
    } else {
      state.bookmarks.unshift({ type: type, id: id });
    }
    writeStorage(STORAGE_BOOKMARKS, state.bookmarks);
    updateTheaterBookmarkBtn();
    renderBrowse();
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
      li.innerHTML = '<strong>' + escapeHtml(ch.name) + '</strong> — <code>' + escapeHtml(ch.id) + '</code> (' + escapeHtml(ch.type || 'official') + ')';
      els.allowlistList.appendChild(li);
    });
  }

  function getAllowedMovies() {
    var movies = (state.catalog && state.catalog.movies) || [];
    return movies.filter(function (m) {
      return isChannelAllowed(m.channelId);
    });
  }

  function getAllowedShows() {
    var shows = (state.catalog && state.catalog.shows) || [];
    return shows.filter(function (s) {
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
     Filtering & Rendering Browse Views
     ------------------------------------------------------- */
  function matchesCommonFilters(item) {
    if (!state.showMature && item.mature === true) return false;

    if (state.genre !== 'all') {
      if ((item.genres || []).indexOf(state.genre) === -1) return false;
    }

    if (state.tag !== 'all') {
      if ((item.tags || []).indexOf(state.tag) === -1) return false;
    }

    if (state.search.trim()) {
      var q = state.search.trim().toLowerCase();
      var haystack = [
        item.title,
        item.synopsis,
        (item.genres || []).join(' '),
        (item.tags || []).join(' '),
        item.language || ''
      ].join(' ').toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
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

  function renderBrowse() {
    if (!state.catalog) return;

    var isAbout = state.activeTab === 'about';
    els.browseView.classList.toggle('hidden', isAbout);
    els.aboutView.classList.toggle('hidden', !isAbout);
    if (isAbout) return;

    var movies = getAllowedMovies();
    var shows = getAllowedShows();

    var filteredMovies = movies.filter(matchesMovieFilters);
    var filteredShows = shows.filter(matchesShowFilters);

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
      '<button class="card-thumb-btn" type="button" aria-label="Open ' + escapeHtml(movie.title) + '">' +
        '<img alt="' + escapeHtml(movie.title) + ' thumbnail" loading="lazy">' +
        '<span class="card-tag-overlay">' + escapeHtml(badgeText) + '</span>' +
      '</button>' +
      '<div class="card-body">' +
        '<div class="card-title-row">' +
          '<h3 class="card-title">' + escapeHtml(movie.title) + '</h3>' +
          '<button class="bookmark-icon-btn ' + (saved ? 'is-saved' : '') + '" type="button" aria-label="Toggle bookmark">' + (saved ? '★' : '☆') + '</button>' +
        '</div>' +
        '<div class="card-meta">' + escapeHtml(movie.year) + ' · ' + escapeHtml(movie.duration || '') + ' · ' + escapeHtml(movie.language || '') + ' · ' + escapeHtml(movie.channelName) + '</div>' +
        '<p class="card-synopsis">' + escapeHtml(movie.synopsis) + '</p>' +
        '<div class="card-chips">' +
          (movie.genres || []).slice(0, 3).map(function (g) {
            return '<span class="chip">' + escapeHtml(g) + '</span>';
          }).join('') +
        '</div>' +
      '</div>';

    var img = card.querySelector('img');
    img.src = thumbUrl(movie.videoId, 'maxresdefault');
    attachThumbFallback(img, movie.videoId);

    card.querySelector('.card-thumb-btn').addEventListener('click', function () {
      openMovieInTheater(movie.id);
    });
    card.querySelector('.bookmark-icon-btn').addEventListener('click', function () {
      toggleBookmark('movie', movie.id);
    });

    return card;
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

  function createShowCard(show) {
    var card = document.createElement('article');
    card.className = 'media-card';

    var info = getShowPreviewInfo(show);
    var saved = isBookmarked('show', show.id);

    card.innerHTML =
      '<button class="card-thumb-btn" type="button" aria-label="Open ' + escapeHtml(show.title) + '">' +
        '<img alt="' + escapeHtml(show.title) + ' thumbnail" loading="lazy">' +
        '<span class="card-tag-overlay">Anime Series · ' + (show.seasons || []).length + ' Season</span>' +
      '</button>' +
      '<div class="card-body">' +
        '<div class="card-title-row">' +
          '<h3 class="card-title">' + escapeHtml(show.title) + '</h3>' +
          '<button class="bookmark-icon-btn ' + (saved ? 'is-saved' : '') + '" type="button" aria-label="Toggle bookmark">' + (saved ? '★' : '☆') + '</button>' +
        '</div>' +
        '<div class="card-meta">' + escapeHtml(show.year) + ' · ' + escapeHtml(info.epCount) + ' Ep listed</div>' +
        '<p class="card-synopsis">' + escapeHtml(show.synopsis) + '</p>' +
        '<div class="card-chips">' +
          (info.hasSub ? '<span class="chip">Sub / EN</span>' : '') +
          (info.hasHi ? '<span class="chip chip-dub">Hindi Dub</span>' : '') +
          (show.genres || []).slice(0, 2).map(function (g) {
            return '<span class="chip">' + escapeHtml(g) + '</span>';
          }).join('') +
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
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'continue-card';
      btn.innerHTML =
        '<img alt="' + escapeHtml(item.title) + '" loading="lazy">' +
        '<div class="continue-info">' +
          '<h3>' + escapeHtml(item.title) + '</h3>' +
          '<p>' + escapeHtml(item.subtitle) + '</p>' +
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
     Theater Player (1 active player, click-to-load, nocookie)
     ------------------------------------------------------- */
  function destroyActivePlayer() {
    if (state.ytPlayerInstance && typeof state.ytPlayerInstance.destroy === 'function') {
      try { state.ytPlayerInstance.destroy(); } catch (e) {}
    }
    state.ytPlayerInstance = null;
    els.playerStage.innerHTML = '';
  }

  function closeTheater() {
    destroyActivePlayer();
    state.theater = null;
    els.theaterSection.classList.add('hidden');
  }

  function openMovieInTheater(movieId) {
    var movie = getAllowedMovies().find(function (m) { return m.id === movieId; });
    if (!movie) return;

    switchTab(state.activeTab === 'about' ? 'all' : state.activeTab);
    state.theater = {
      type: 'movie',
      id: movie.id,
      playerLoaded: false
    };
    renderTheater();
    els.theaterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openShowInTheater(showId, seasonIndex, preferredTrack, preferredEp) {
    var show = getAllowedShows().find(function (s) { return s.id === showId; });
    if (!show) return;

    switchTab(state.activeTab === 'about' ? 'all' : state.activeTab);

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
      notice: '',
      playerLoaded: false
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
      els.theaterChannelBadge.textContent = 'Official: ' + movie.channelName;
      els.theaterTitle.textContent = movie.title;
      els.theaterSubtitle.textContent = [movie.year, movie.duration, movie.language].filter(Boolean).join(' · ');
      els.theaterSynopsis.textContent = movie.synopsis || '';
      els.watchYtLink.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(movie.videoId);

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

    var hasSub = getTrackEpisodes(season, 'sub').length > 0;
    var hasHi = getTrackEpisodes(season, 'hi').length > 0;

    els.theaterTypeBadge.textContent = 'Anime Series';
    els.theaterChannelBadge.textContent = 'Official: ' + trackObj.channelName;
    els.theaterTitle.textContent = show.title;
    els.theaterSubtitle.textContent =
      (season.title || ('Season ' + season.seasonNumber)) +
      ' · Episode ' + currentEp.ep + ': ' + currentEp.title +
      ' (' + (trackObj.label || trackKey) + ')';
    els.theaterSynopsis.textContent = show.synopsis || '';
    els.watchYtLink.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(currentEp.videoId);

    els.episodeNavControls.classList.remove('hidden');
    els.prevEpBtn.disabled = epIndex <= 0;
    els.nextEpBtn.disabled = epIndex >= episodes.length - 1;

    // Show Sub / EN vs Hindi Dub toggle ONLY when both tracks exist
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

    // Season dropdown & Episode list
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
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ep-btn' + (ep.ep === currentEp.ep ? ' is-active' : '');
      btn.innerHTML =
        '<span class="ep-num">Episode ' + escapeHtml(ep.ep) + (ep.duration ? ' · ' + escapeHtml(ep.duration) : '') + '</span>' +
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

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb-loader';
    btn.setAttribute('aria-label', 'Play ' + label);
    btn.innerHTML =
      '<img alt="' + escapeHtml(label) + ' preview thumbnail">' +
      '<div class="thumb-play-overlay">' +
        '<span class="play-circle" aria-hidden="true">▶</span>' +
        '<span class="play-label">Click to Load Official YouTube Player</span>' +
      '</div>';

    var img = btn.querySelector('img');
    img.src = thumbUrl(videoId, 'maxresdefault');
    attachThumbFallback(img, videoId);

    btn.addEventListener('click', function () {
      mountYouTubePlayer(videoId, label);
    });

    els.playerStage.appendChild(btn);
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
      }, 3000);

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

  function mountYouTubePlayer(videoId, label) {
    destroyActivePlayer();
    var mountDiv = document.createElement('div');
    mountDiv.id = 'yt-player-mount';
    els.playerStage.appendChild(mountDiv);

    ensureYouTubeApi().then(function (YT) {
      if (!document.getElementById('yt-player-mount')) return;
      state.ytPlayerInstance = new YT.Player('yt-player-mount', {
        host: 'https://www.youtube-nocookie.com',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onError: function () {
            renderUnavailableStage(
              videoId,
              'This video cannot be played inside an embed (it may be region-restricted, private, or have embedding disabled).'
            );
          }
        }
      });
    }).catch(function () {
      // Fallback to direct privacy-enhanced iframe if API script is blocked
      els.playerStage.innerHTML =
        '<iframe ' +
          'src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0" ' +
          'title="' + escapeHtml(label) + '" ' +
          'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
          'referrerpolicy="strict-origin-when-cross-origin" ' +
          'allowfullscreen>' +
        '</iframe>';
    });
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

  /* -------------------------------------------------------
     Navigation & Event Listeners
     ------------------------------------------------------- */
  function switchTab(tab) {
    state.activeTab = tab;
    els.navBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
    if (tab === 'about') {
      closeTheater();
    }
    renderBrowse();
  }

  function bindEvents() {
    if (els.skipIntroBtn) {
      els.skipIntroBtn.addEventListener('click', dismissIntro);
    }
    if (els.replayIntroBtn) {
      els.replayIntroBtn.addEventListener('click', replayIntro);
    }

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

    els.footerAboutBtn.addEventListener('click', function () {
      switchTab('about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    els.retryLoadBtn.addEventListener('click', initData);
    els.closeTheaterBtn.addEventListener('click', closeTheater);

    els.theaterBookmarkBtn.addEventListener('click', function () {
      if (!state.theater) return;
      toggleBookmark(state.theater.type, state.theater.id);
    });

    els.prevEpBtn.addEventListener('click', function () { stepEpisode(-1); });
    els.nextEpBtn.addEventListener('click', function () { stepEpisode(1); });

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

    els.matureToggle.addEventListener('change', function () {
      state.showMature = els.matureToggle.checked;
      renderContinueWatching();
      renderBrowse();
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
  }

  /* -------------------------------------------------------
     Start App
     ------------------------------------------------------- */
  state.bookmarks = readStorage(STORAGE_BOOKMARKS, []);
  state.history = readStorage(STORAGE_HISTORY, []);

  setupIntro();
  bindEvents();
  initData();
})();
