# Paper Consumption in the Digital Age: Environmental Impacts & Sustainable Alternatives

> ### 🌐 Live Website URL: [https://kartikagrawal2200.github.io/Environment-CHE-132-project/](https://kartikagrawal2200.github.io/Environment-CHE-132-project/)
> **👉 Click the link above to directly open and interact with the live website!**

[![Live Website](https://img.shields.io/badge/Live%20Site-Visit%20Now-2ea44f?style=for-the-badge&logo=googlechrome&logoColor=white)](https://kartikagrawal2200.github.io/Environment-CHE-132-project/)
[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-123642?style=for-the-badge&logo=github&logoColor=white)](https://kartikagrawal2200.github.io/Environment-CHE-132-project/)

A multi-page research and sustainability platform investigating global paper consumption, ecological footprints, and actionable digital transitions across modern organizations and workplaces.

---


## 📁 Project Structure

```text
├── index.html              # Home page (Hero, Stat Counters, Before/After Slider, Chart Preview, Newsletter)
├── lifecycle.html          # Interactive 7-stage lifecycle stepper (Forest to Landfill)
├── impact.html             # Environmental impact data (Water, Carbon, Forest, Landfill)
├── paper-vs-digital.html   # Side-by-side comparative trade-off matrix & charts
├── solutions.html          # Solutions module: 5 R's framework + Green AI/ML compute
├── action-plan.html        # 10-step organizational roadmap for sustainable operations
├── calculator.html         # Interactive Footprint Calculator + 5-Question Sustainability Quiz
├── resources.html          # Scientific citations, bibliography, and downloadable toolkits
├── about.html              # Research team, advisory panel, and objectives
├── contact.html            # Contact & sustainability pledge portal
├── privacy.html            # Data privacy policy & research integrity statement
├── 404.html                # Error page
├── robots.txt              # Search engine directives
├── sitemap.xml             # XML sitemap for SEO
├── css/
│   └── style.css           # Design system (Fraunces + IBM Plex Sans, dark mode, responsive, WCAG AA)
├── js/
│   ├── main.js             # Theme toggle, slider, counters, scroll animations, Chart.js preview
│   ├── charts.js           # Full interactive charts (Footprint, Recycled vs Virgin, Organizational Trends)
│   └── calculator.js       # Paper footprint logic & interactive quiz engine
└── assets/
    ├── icons/              # Scalable SVG icons and project marks
    └── images/             # Visual assets and illustrations
```

---

## 🚀 Running Locally

Because this project is built with clean HTML5, CSS3, and modern JavaScript, no build tool or package manager installation is required.

### Option 1: Python HTTP Server (Recommended)
Open a terminal in the project directory and run:
```bash
# Python 3
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

### Option 2: VS Code Live Server
1. Open the project folder in VS Code or Antigravity IDE.
2. Right-click on `index.html`.
3. Select **"Open with Live Server"**.

---

## 🌐 Free Deployment Instructions

### 1. GitHub Pages (Free, Integrated with your Repo)
1. Push your changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Deploy multi-page sustainability platform"
   git push origin main
   ```
2. In your GitHub repository, click **Settings** &rarr; **Pages** (under Code and automation in the left sidebar).
3. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
4. Within 1–2 minutes, your website will be live at:
   `https://kartikagrawal2200.github.io/Environment-CHE-132-project/`

#### Connecting a Custom Domain on GitHub Pages:
- In **Settings** &rarr; **Pages**, enter your domain under **Custom domain** (e.g. `sustainability.yourdomain.com`).
- Add a `CNAME` record in your DNS provider pointing to `kartikagrawal2200.github.io`.
- Check **Enforce HTTPS**.

### 2. Netlify (Free, Drag-and-Drop or Git Linked)
1. Visit [netlify.com](https://www.netlify.com) and log in.
2. Choose **"Import an existing project"** &rarr; select **GitHub** &rarr; authorize and select `Environment-CHE-132-project`.
3. Set Publish directory to `.` (root).
4. Click **Deploy Site**. Netlify will provide an instant live URL with automated SSL.