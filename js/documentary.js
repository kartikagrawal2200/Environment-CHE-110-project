/* Documentary player + report page viewer. Edit the data-* attributes in index.html, not this file. */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Documentary ---------- */
  var player = $('docPlayer');
  if (player) {
    var driveId = (player.dataset.driveId || '').trim();
    var mp4 = player.dataset.video, poster = player.dataset.poster, media = null;
    var chapters = [].slice.call(document.querySelectorAll('.doc-ch'));

    var markChapter = function () {
      if (!media || !media.currentTime) return;
      var k = 0;
      chapters.forEach(function (c, i) { if (media.currentTime >= +c.dataset.start) k = i; });
      chapters.forEach(function (c, i) { c.setAttribute('aria-current', i === k); });
    };

    var start = function (at) {
      player.innerHTML = '';
      if (driveId) {
        var f = document.createElement('iframe');
        f.src = 'https://drive.google.com/file/d/' + driveId + '/preview';
        f.title = 'Project documentary'; f.allow = 'autoplay; fullscreen'; f.allowFullscreen = true;
        player.appendChild(f); return;
      }
      media = document.createElement('video');
      media.src = mp4; media.controls = true; media.autoplay = true; media.playsInline = true;
      if (poster) media.poster = poster;
      media.addEventListener('loadedmetadata', function () { if (at) media.currentTime = at; });
      media.addEventListener('timeupdate', markChapter);
      media.addEventListener('error', function () {
        var e = document.createElement('div'); e.className = 'doc-error';
        e.textContent = 'The video could not be played. Check that ' + mp4 + ' exists, or try another browser.';
        player.appendChild(e);
      });
      player.appendChild(media);
    };

    $('docPlay').addEventListener('click', function () { start(0); });
    chapters.forEach(function (c) {
      c.addEventListener('click', function () {
        var t = +c.dataset.start;
        if (driveId) { if (!player.querySelector('iframe')) start(0); return; }  /* Drive embeds cannot be seeked */
        if (!media) start(t); else { media.currentTime = t; var pr = media.play(); if (pr && pr.catch) pr.catch(function () {}); }
      });
    });
  }

  /* ---------- Report ---------- */
  var rep = $('reportViewer');
  if (rep) {
    var total = +rep.dataset.pages, pattern = rep.dataset.pattern, page = 1;
    var fig = $('rpStage'), thumbs = $('rpThumbs'), label = $('rpLabel'), prev = $('rpPrev'), next = $('rpNext');
    var url = function (n) { return pattern.replace('{n}', n); };

    var show = function (n) {
      page = Math.min(Math.max(1, n), total);
      fig.innerHTML = '';
      var img = new Image();
      img.alt = 'Report page ' + page + ' of ' + total;
      img.onerror = function () {
        fig.innerHTML = '<p class="rp-missing">Page ' + page + ' is not uploaded yet.<br>Add <code>' + url(page) + '</code> to the repo.</p>';
      };
      img.src = url(page);
      fig.appendChild(img);
      label.textContent = 'Page ' + page + ' of ' + total;
      prev.disabled = page === 1; next.disabled = page === total;
      [].forEach.call(thumbs.children, function (b, i) { b.setAttribute('aria-current', i + 1 === page); });
    };

    for (var i = 1; i <= total; i++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'rp-thumb'; b.textContent = n;
        b.setAttribute('aria-label', 'Go to page ' + n);
        b.addEventListener('click', function () { show(n); });
        thumbs.appendChild(b);
      })(i);
    }
    prev.addEventListener('click', function () { show(page - 1); });
    next.addEventListener('click', function () { show(page + 1); });
    rep.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(page - 1);
      if (e.key === 'ArrowRight') show(page + 1);
    });
    show(1);

    /* Hide the whole report section until page_1 exists, so visitors never see an empty viewer */
    var section = $('report'), probe = new Image();
    if (section) {
      section.hidden = true;
      probe.onload = function () { section.hidden = false; };
      probe.src = url(1);
    }
  }
})();
