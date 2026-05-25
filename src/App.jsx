import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Timer,
  WebGLRenderer,
} from "three";
import { projects, stack } from "./data";

const navLinks = ["work", "stack", "about"];

const heroStats = [
  ["3+", "Years building"],
  ["15+", "Projects shipped"],
  ["2", "Stacks mastered"],
  ["Open", "For collaboration"],
];

const aboutTags = [
  "TypeScript",
  "React",
  "Next.js",
  "Backend Systems",
  "E-commerce",
  "UI Engineering",
];

const infoRows = [
  ["Name", "JP Pacho"],
  ["Company", "Rooche Digital Web Design"],
  ["Role", "Full-stack Developer"],
  ["Based in", "Tacloban City, PH"],
  ["Experience", "3+ Years"],
  ["Availability", <span className="avail-dot">Open to projects</span>],
];

const contactLinks = [
  ["GitHub", "github.com/jp-pacho-ts", "https://github.com/jp-pacho-ts"],
  ["Company Work", "Rooche / getJuicy", "https://github.com/getJuicy"],
  ["Public Projects", "github.com/jp-pacho-ts?tab=repositories", "https://github.com/jp-pacho-ts?tab=repositories"],
  ["Location", "Tacloban City, PH", "#contact"],
];

function useScrolledNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return scrolled;
}

function useThreeBackground(canvasRef, isDark) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const sceneColor = isDark ? 0xf7f4ec : 0x111111;
    const gridOp   = isDark ? 0.22 : 0.10;
    const pAlpha   = isDark ? 0.20 : 0.11;
    const pSize    = isDark ? 0.55 : 0.80;
    const pMaxSize = isDark ? 3.0  : 4.0;

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene  = new Scene();
    const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 350);
    camera.position.set(0, 14, 28);

    // ─── Perspective grid ─────────────────────────────────────────────────
    const SPACING   = 8;
    const HALF_W    = 72;
    const Z_NEAR    = 28;
    const Z_FAR     = -210;
    const COL_COUNT = Math.round((HALF_W * 2) / SPACING) + 1;
    const ROW_COUNT = Math.round((Z_NEAR - Z_FAR) / SPACING) + 3;

    // Z-lines: run along Z at fixed X, static (these converge to vanishing pt)
    const zVerts = [];
    for (let i = 0; i < COL_COUNT; i += 1) {
      const x = (i / (COL_COUNT - 1) - 0.5) * HALF_W * 2;
      zVerts.push(x, 0, Z_NEAR, x, 0, Z_FAR);
    }
    const zGeo = new BufferGeometry();
    zGeo.setAttribute("position", new BufferAttribute(new Float32Array(zVerts), 3));

    // X-lines: run along X at fixed Z, scroll toward viewer each frame
    const xVerts = [];
    for (let j = 0; j < ROW_COUNT; j += 1) {
      const z = Z_NEAR - j * SPACING;
      xVerts.push(-HALF_W, 0, z, HALF_W, 0, z);
    }
    const xGeo = new BufferGeometry();
    xGeo.setAttribute("position", new BufferAttribute(new Float32Array(xVerts), 3));

    // Grid shader: fade lines to transparent as they recede toward the horizon
    const gridVS = `
      varying float vFade;
      void main() {
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vFade = 1.0 - smoothstep(-55.0, -185.0, wPos.z);
        gl_Position = projectionMatrix * viewMatrix * wPos;
      }
    `;
    const gridFS = `
      uniform vec3  uColor;
      uniform float uOp;
      varying float vFade;
      void main() {
        float a = uOp * vFade;
        if (a < 0.005) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `;
    const makeGridMat = () => new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(sceneColor) },
        uOp:    { value: gridOp },
      },
      vertexShader:   gridVS,
      fragmentShader: gridFS,
      transparent:    true,
      depthWrite:     false,
    });

    const zMat   = makeGridMat();
    const xMat   = makeGridMat();
    const zLines = new LineSegments(zGeo, zMat);
    const xLines = new LineSegments(xGeo, xMat);
    scene.add(zLines, xLines);

    // ─── Ambient particles floating above the grid ────────────────────────
    const isMobile = window.innerWidth < 768;
    const P_COUNT = isMobile ? 700 : 1600;
    const pPos    = new Float32Array(P_COUNT * 3);
    for (let i = 0; i < P_COUNT; i += 1) {
      pPos[i * 3]     = (Math.random() - 0.5) * 160;
      pPos[i * 3 + 1] = Math.random() * 35 + 1;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 230;
    }
    const pGeo = new BufferGeometry();
    pGeo.setAttribute("position", new BufferAttribute(pPos, 3));

    const pMat = new ShaderMaterial({
      uniforms: {
        uTime:    { value: 0 },
        uColor:   { value: new Color(sceneColor) },
        uAlpha:   { value: pAlpha },
        uSize:    { value: pSize },
        uMaxSize: { value: pMaxSize },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform float uMaxSize;
        void main() {
          vec3 p = position;
          p.y += sin(p.x * 0.07 + uTime * 0.5) * cos(p.z * 0.05 + uTime * 0.4) * 2.5;
          vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(uSize * (200.0 / -mvPos.z), 0.5, uMaxSize);
          gl_Position  = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3  uColor;
        uniform float uAlpha;
        void main() {
          float e = smoothstep(0.5, 0.2, distance(gl_PointCoord, vec2(0.5)));
          if (e < 0.01) discard;
          gl_FragColor = vec4(uColor, uAlpha * e);
        }
      `,
      transparent: true,
      depthWrite:  false,
    });

    const dots = new Points(pGeo, pMat);
    scene.add(dots);

    // ─── Mouse tracking ───────────────────────────────────────────────────
    let rawMouseX = 0;
    let rawMouseY = 0;
    let smoothCamX = 0;
    let smoothCamY = 14;

    const handleMouseMove = (e) => {
      rawMouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      rawMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const handleTouchMove = (e) => {
      if (!e.touches[0]) return;
      rawMouseX = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
      rawMouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // ─── Animation loop ───────────────────────────────────────────────────
    const timer = new Timer();
    timer.connect(document);
    let rafId = 0;
    let gridZ = 0;

    const tick = (timestamp) => {
      rafId = requestAnimationFrame(tick);
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      const delta   = timer.getDelta();

      // Scroll X-lines toward viewer, loop seamlessly
      gridZ += delta * 5;
      if (gridZ >= SPACING) gridZ -= SPACING;
      xLines.position.z = gridZ;

      // Smooth camera pan with mouse
      smoothCamX += (rawMouseX * 6  - smoothCamX) * 0.04;
      smoothCamY += (14 - rawMouseY * 3 - smoothCamY) * 0.04;
      camera.position.x = smoothCamX;
      camera.position.y = smoothCamY;
      camera.lookAt(smoothCamX * 0.25, 0, -20);

      pMat.uniforms.uTime.value = elapsed;

      renderer.render(scene, camera);
    };

    tick();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResize);
      zGeo.dispose(); zMat.dispose();
      xGeo.dispose(); xMat.dispose();
      pGeo.dispose(); pMat.dispose();
      timer.dispose();
      renderer.dispose();
    };
  }, [canvasRef, isDark]);
}

function App() {
  const canvasRef = useRef(null);
  const themeButtonRef = useRef(null);
  const themeTimerRef = useRef(null);
  const scrolled = useScrolledNav();
  const [loaderPhase, setLoaderPhase] = useState("active");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;

    const savedTheme = window.localStorage.getItem("jp-theme");
    if (savedTheme) return savedTheme === "dark";

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [themeAnimating, setThemeAnimating] = useState(false);

  useThreeBackground(canvasRef, isDark);

  useEffect(() => {
    const leave  = setTimeout(() => setLoaderPhase("leaving"), 1800);
    const remove = setTimeout(() => setLoaderPhase("gone"),    2500);
    return () => { clearTimeout(leave); clearTimeout(remove); };
  }, []);

  useEffect(() => {
    const theme = isDark ? "dark" : "light";

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("jp-theme", theme);
  }, [isDark]);

  useEffect(() => {
    return () => {
      window.clearTimeout(themeTimerRef.current);
    };
  }, []);

  const handleThemeToggle = () => {
    const rect = themeButtonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 48;
    const y = rect ? rect.top + rect.height / 2 : 36;

    document.documentElement.style.setProperty("--theme-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-y", `${y}px`);
    window.clearTimeout(themeTimerRef.current);
    setThemeAnimating(false);

    window.requestAnimationFrame(() => {
      setIsDark((current) => !current);
      setThemeAnimating(true);
      themeTimerRef.current = window.setTimeout(() => {
        setThemeAnimating(false);
      }, 760);
    });
  };

  return (
    <>
      {loaderPhase !== "gone" && (
        <div
          className={`loader${loaderPhase === "leaving" ? " is-leaving" : ""}`}
          aria-label="Loading"
          aria-live="polite"
        >
          <div className="loader-panel loader-panel-top" />
          <div className="loader-center">
            <div className="loader-logo">JP<span> / </span>Dev</div>
            <div className="loader-sub">Full-Stack Developer</div>
          </div>
          <div className="loader-panel loader-panel-bottom" />
        </div>
      )}
      <canvas ref={canvasRef} className="bg" aria-hidden="true" />
      <div
        className={`theme-transition ${themeAnimating ? "is-active" : ""}`}
        aria-hidden="true"
      />

      <nav className={scrolled ? "scrolled" : ""}>
        <a className="logo" href="#hero" aria-label="Back to top">
          JP<span> / </span>Dev
        </a>
        <div className="nav-actions">
          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link}>
                <a href={`#${link}`}>{link}</a>
              </li>
            ))}
            <li>
              <a className="nav-cta" href="#contact">
                Hire me
              </a>
            </li>
          </ul>
          <button
            className="theme-toggle"
            type="button"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDark}
            onClick={handleThemeToggle}
            ref={themeButtonRef}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            <Sun className="theme-icon theme-icon-sun" aria-hidden="true" size={16} />
            <Moon className="theme-icon theme-icon-moon" aria-hidden="true" size={16} />
          </button>
        </div>
      </nav>

      <main>
        <section className="hero" id="hero">
          <div className="hero-left">
            <h1 className="hero-title">
              Full-Stack
              <br />
              Web
              <span className="thin">Developer</span>
            </h1>
            <p className="hero-desc">
              Building practical, polished digital products with TypeScript, React,
              Next.js, Node.js, PostgreSQL, Prisma, Stripe, Shopify, and modern UI
              systems. Based in Tacloban City, PH.
            </p>
            <div className="hero-actions">
              <a className="btn-primary" href="#work">
                View work
              </a>
              <a className="btn-ghost" href="#contact">
                Get in touch
              </a>
            </div>
          </div>

          <div className="hero-right">
            {heroStats.map(([num, label]) => (
              <div className="hero-stat" key={label}>
                <div className="stat-num">{num}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="work">
          <div className="sec-header">
            <div>
              <div className="sec-label">Selected work</div>
              <div className="sec-title">Recent projects</div>
            </div>
            <a className="sec-link" href="#contact">
              Start a project
            </a>
          </div>

          <div className="work-grid">
            {projects.map((project) => (
              <a
                className="work-card"
                href={project.href}
                key={project.id}
                target="_blank"
                rel="noreferrer"
              >
                <div className="work-card-top">
                  <span className="work-num">{project.id}</span>
                  <span className="work-year-badge">{project.year}</span>
                </div>
                <h2 className="work-title">{project.title}</h2>
                <p className="work-desc">{project.desc}</p>
                <div className="work-tag">{project.tag}</div>
              </a>
            ))}
          </div>
        </section>

        <section id="stack" className="stack-section">
          <div className="sec-header">
            <div>
              <div className="sec-label">Technology</div>
              <div className="sec-title">My stack</div>
            </div>
          </div>

          <div className="stack-grid">
            {stack.map((item) => (
              <div className="stack-card" key={item.name}>
                {item.devicon ? (
                  <i className={`stack-icon ${item.devicon}`} aria-hidden="true" />
                ) : (
                  <span className="stack-abbr">{item.abbr}</span>
                )}
                <div className="stack-name">{item.name}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="about">
          <div className="sec-header">
            <div>
              <div className="sec-label">About me</div>
              <div className="sec-title">Who I am</div>
            </div>
          </div>

          <div className="about-layout">
            <div className="about-left">
              <p className="about-big">
                I'm <strong>JP Pacho</strong>, a developer from{" "}
                <strong>Tacloban City</strong> building web apps, product prototypes, and
                business systems across personal, academic, and company projects at{" "}
                <strong>Rooche Digital Web Design</strong>.
                <br />
                <br />I work mostly with <strong>TypeScript, React, Next.js, Node.js,
                PostgreSQL, Prisma, Tailwind CSS, shadcn/ui, Radix UI, Stripe, Shopify,
                Docker, and Fly.io</strong>. I like clean interfaces, reliable workflows,
                and projects that feel useful from the first click.
              </p>
              <div className="about-tags">
                {aboutTags.map((tag) => (
                  <span className="about-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="about-right">
              <div className="info-block">
                {infoRows.map(([key, value]) => (
                  <div className="info-row" key={key}>
                    <span className="info-key">{key}</span>
                    <span className="info-val">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="contact-section">
          <div className="contact-wrap">
            <div className="contact-left">
              <div className="sec-label contact-label">Contact</div>
              <div className="contact-big">Let's build something great.</div>
              <p className="contact-sub">
                Have a project in mind? Whether it is a React app, Next.js product,
                e-commerce build, dashboard, or backend workflow, I am ready to help.
              </p>
            </div>

            <div className="contact-right">
              {contactLinks.map(([type, label, href]) => {
                const external = href.startsWith("http");

                return (
                  <a
                    className="clink"
                    href={href}
                    key={type}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                  >
                    <span className="clink-left">
                      <span className="clink-type">{type}</span>
                      <span className="clink-label">{label}</span>
                    </span>
                    <span className="clink-arrow" aria-hidden="true">
                      NE
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <footer>
          <div className="footer-left">(c) 2026 JP Pacho / All rights reserved</div>
          <div className="footer-right">
            <a href="#hero">Back to top</a>
          </div>
        </footer>
      </main>
    </>
  );
}

export default App;
