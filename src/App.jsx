import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Timer,
  Vector3,
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
    const wireOpacity = isDark ? 0.1 : 0.06;
    const ringOpacity = isDark ? 0.22 : 0.15;

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new Scene();
    const camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.z = 45;

    const particleCount = 25000;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i += 1) {
      const radius = Math.random() ** 0.4;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = (Math.random() - 0.5) * 140 + Math.sin(angle) * radius * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100 + Math.cos(angle) * radius * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }

    const particleGeometry = new BufferGeometry();
    particleGeometry.setAttribute("position", new BufferAttribute(positions, 3));

    const mouseUniform = new Vector3(99999, 99999, 0);
    const particleMaterial = new ShaderMaterial({
      uniforms: {
        uMouse: { value: mouseUniform },
        uRadius: { value: 16.0 },
        uTime: { value: 0.0 },
        uColor: { value: new Color(sceneColor) },
      },
      vertexShader: `
        uniform vec3 uMouse;
        uniform float uRadius;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          float wave = sin(p.x * 0.12 + uTime * 0.9) * cos(p.y * 0.14 + uTime * 0.7) * 2.5;
          p.z += wave;
          vec4 worldPos = modelMatrix * vec4(p, 1.0);
          float d = distance(worldPos.xy, uMouse.xy);
          vAlpha = 1.0 - smoothstep(0.0, uRadius, d);
          vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 0.45 * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          float alpha = vAlpha;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const dots = new Points(particleGeometry, particleMaterial);
    scene.add(dots);

    const wireGeometry = new EdgesGeometry(new IcosahedronGeometry(26, 2));
    const wireMaterial = new LineBasicMaterial({
      color: sceneColor,
      transparent: true,
      opacity: wireOpacity,
    });
    const wire = new LineSegments(wireGeometry, wireMaterial);
    scene.add(wire);

    const createRing = (radius, tube, x, y, z, rotationX, opacity) => {
      const ring = new Mesh(
        new TorusGeometry(radius, tube, 8, 100),
        new MeshBasicMaterial({ color: sceneColor, transparent: true, opacity })
      );
      ring.rotation.x = rotationX;
      ring.position.set(x, y, z);

      return ring;
    };

    const ring1 = createRing(9, 0.025, 20, -10, -4, Math.PI / 4, ringOpacity);
    const ring2 = createRing(5, 0.015, -18, 12, -8, Math.PI / 6, ringOpacity * 0.7);
    scene.add(ring1, ring2);

    let rawMouseX = 0;
    let rawMouseY = 0;

    const handleMouseMove = (event) => {
      rawMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      rawMouseY = (event.clientY / window.innerHeight - 0.5) * 2;

      const ndc = new Vector3(rawMouseX, -rawMouseY, 0.5).unproject(camera);
      const dir = ndc.clone().sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;

      mouseUniform.copy(camera.position).addScaledVector(dir, distance);
      particleMaterial.uniforms.uMouse.value.copy(mouseUniform);
    };

    const handleMouseLeave = () => {
      particleMaterial.uniforms.uMouse.value.set(99999, 99999, 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const timer = new Timer();
    timer.connect(document);
    let rafId = 0;

    const tick = (timestamp) => {
      rafId = requestAnimationFrame(tick);
      timer.update(timestamp);
      const elapsed = timer.getElapsed();

      particleMaterial.uniforms.uTime.value = elapsed;
      dots.rotation.y = elapsed * 0.006 + rawMouseX * 0.02;
      dots.rotation.x = rawMouseY * 0.015;
      wire.rotation.y = elapsed * 0.018 + rawMouseX * 0.025;
      wire.rotation.x = elapsed * 0.012 + rawMouseY * 0.018;
      ring1.rotation.z = elapsed * 0.055;
      ring2.rotation.z = -elapsed * 0.04;

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
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);

      particleGeometry.dispose();
      particleMaterial.dispose();
      wireGeometry.dispose();
      wireMaterial.dispose();
      ring1.geometry.dispose();
      ring1.material.dispose();
      ring2.geometry.dispose();
      ring2.material.dispose();
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
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;

    const savedTheme = window.localStorage.getItem("jp-theme");
    if (savedTheme) return savedTheme === "dark";

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [themeAnimating, setThemeAnimating] = useState(false);

  useThreeBackground(canvasRef, isDark);

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
            <div className="hero-badge">Available for freelance</div>
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
