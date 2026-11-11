async function loadNews() {
  const news = document.querySelector('#scheduled-news');
  const response = await fetch(news.dataset.feed, {
    credentials: 'omit',
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return;
  // The Site's news endpoint renders and escapes the same public entries used on its News page.
  news.insertAdjacentHTML('afterend', await response.text());
}

loadNews().catch(() => {
  // The page already contains its published editorial articles.
});
