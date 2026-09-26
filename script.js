document.addEventListener("DOMContentLoaded", function () {

  // Année automatique dans le footer
  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Menu mobile
  const menuButton = document.querySelector(".menu");
  const nav = document.querySelector("nav");

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
  }

  // Charger les actualités
  loadActualites();
});


async function loadActualites() {

  const container = document.getElementById("news-container");

  if (!container) {
    return;
  }

  const apiUrl =
    "https://api.github.com/repos/cnoscidh-ong/cnoscidh.github.io/contents/content/actualites";

  try {

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Impossible de charger les actualités.");
    }

    const files = await response.json();

    const markdownFiles = files.filter(function (file) {
      return (
        file.type === "file" &&
        (file.name.endsWith(".md") || file.name.endsWith(".markdown"))
      );
    });

    if (markdownFiles.length === 0) {
      container.innerHTML =
        "<p>Aucune actualité publiée pour le moment.</p>";
      return;
    }

    const articles = [];

    for (const file of markdownFiles) {

      try {

        const fileResponse = await fetch(file.download_url);

        if (!fileResponse.ok) {
          continue;
        }

        const text = await fileResponse.text();

        const article = parseMarkdownArticle(text);

        article.filename = file.name;

        articles.push(article);

      } catch (error) {
        console.error("Erreur avec le fichier :", file.name, error);
      }
    }

    // Plus récent en premier
    articles.sort(function (a, b) {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    if (articles.length === 0) {
      container.innerHTML =
        "<p>Aucune actualité publiée pour le moment.</p>";
      return;
    }

    container.innerHTML = "";

    articles.forEach(function (article) {

      const articleElement = document.createElement("article");
      articleElement.className = "news-card";

      let imageHTML = "";

      if (article.image) {

        const imageSrc = resolveImagePath(article.image);

        imageHTML =
          '<img src="' +
          escapeHTML(imageSrc) +
          '" alt="' +
          escapeHTML(article.title || "Actualité") +
          '" class="news-image">';

      }

      articleElement.innerHTML =
        imageHTML +
        '<div class="news-content">' +

        "<h3>" +
        escapeHTML(article.title || "Actualité") +
        "</h3>" +

        '<p class="news-date">' +
        formatDate(article.date) +
        "</p>" +

        '<div class="news-body">' +
        simpleMarkdown(article.body || "") +
        "</div>" +

        "</div>";

      container.appendChild(articleElement);
    });

  } catch (error) {

    console.error("Erreur chargement actualités :", error);

    container.innerHTML =
      "<p>Les actualités ne peuvent pas être chargées pour le moment.</p>";
  }
}


/*
  Corrige automatiquement les chemins des images
  lorsque le site est hébergé dans /cnoscidh.github.io/
*/
function resolveImagePath(imagePath) {

  if (!imagePath) {
    return "";
  }

  try {

    return new URL(
      imagePath.replace(/^\/+/, ""),
      window.location.href
    ).href;

  } catch (error) {

    console.error("Erreur chemin image :", imagePath, error);

    return imagePath;
  }
}


function parseMarkdownArticle(text) {

  const article = {
    title: "",
    date: "",
    image: "",
    body: ""
  };

  // Chercher le front matter
  const frontMatterMatch =
    text.match(/^---\s*([\s\S]*?)\s*---/);

  if (frontMatterMatch) {

    const frontMatter = frontMatterMatch[1];

    frontMatter.split("\n").forEach(function (line) {

      const separator = line.indexOf(":");

      if (separator === -1) {
        return;
      }

      const key =
        line.substring(0, separator).trim();

      let value =
        line.substring(separator + 1).trim();

      value =
        value.replace(/^["']|["']$/g, "");

      if (key === "title") {
        article.title = value;
      }

      if (key === "date") {
        article.date = value;
      }

      if (key === "image") {
        article.image = value;
      }

    });

    article.body =
      text.replace(frontMatterMatch[0], "").trim();

  } else {

    article.body = text.trim();

  }

  return article;
}


function simpleMarkdown(text) {

  let html = escapeHTML(text);

  // Titres
  html = html.replace(
    /^### (.*)$/gm,
    "<h4>$1</h4>"
  );

  html = html.replace(
    /^## (.*)$/gm,
    "<h3>$1</h3>"
  );

  html = html.replace(
    /^# (.*)$/gm,
    "<h2>$1</h2>"
  );

  // Texte en gras
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  // Liens
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Sauts de ligne
  html = html.replace(
    /\n{2,}/g,
    "</p><p>"
  );

  html = "<p>" + html + "</p>";

  return html;
}


function escapeHTML(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(dateString) {

  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}
