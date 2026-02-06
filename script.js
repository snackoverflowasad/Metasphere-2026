const slides = document.querySelectorAll("#tech-carousel img");
let current = 0;

function showNextSlide() {
    slides[current].classList.remove("opacity-100");
    slides[current].classList.add("opacity-0");
    current = (current + 1) % slides.length;
    slides[current].classList.remove("opacity-0");
    slides[current].classList.add("opacity-100");
}

if (slides.length > 0) {
    setInterval(showNextSlide, 3000);
}

function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    const isHidden = dropdown.classList.contains("hidden");

    document
        .querySelectorAll("nav .absolute")
        .forEach((el) => el.classList.add("hidden"));

    if (isHidden) dropdown.classList.remove("hidden");
}

function toggleMobileMenu() {
    document.getElementById("mobileMenu").classList.toggle("hidden");
}

document.addEventListener("click", function (event) {
    const nav = document.querySelector("nav");
    if (nav && !nav.contains(event.target)) {
        document
            .querySelectorAll("nav .absolute")
            .forEach((el) => el.classList.add("hidden"));
    }
});

const iemImages = document.querySelectorAll("#iem-carousel img");
let currentIem = 0;

function showNextIemImage() {
    iemImages[currentIem].classList.remove("opacity-100");
    iemImages[currentIem].classList.add("opacity-0");
    currentIem = (currentIem + 1) % iemImages.length;
    iemImages[currentIem].classList.remove("opacity-0");
    iemImages[currentIem].classList.add("opacity-100");
}

if (iemImages.length > 0) {
    setInterval(showNextIemImage, 5000);
}

const countdownDate = new Date("2026-08-21T09:00:00").getTime();

function updateCountdown() {
    const now = new Date().getTime();
    const distance = countdownDate - now;

    if (distance < 0) {
        const container = document.getElementById("countdown-container");
        if (container) {
            container.innerHTML =
                "<p class='text-sm font-bold text-orange-400'>Event is Live!</p>";
        }
        clearInterval(timerInterval);
        return;
    }
    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);

    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minsEl = document.getElementById("minutes");
    const secsEl = document.getElementById("seconds");

    if (daysEl) daysEl.innerText = d.toString().padStart(2, "0");
    if (hoursEl) hoursEl.innerText = h.toString().padStart(2, "0");
    if (minsEl) minsEl.innerText = m.toString().padStart(2, "0");
    if (secsEl) secsEl.innerText = s.toString().padStart(2, "0");
}

const timerInterval = setInterval(updateCountdown, 1000);
updateCountdown();

if (typeof lucide !== "undefined") {
    lucide.createIcons();
}

function setupCarousel(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    const track = carousel.querySelector(".carousel-track");
    if (!track) return;

    const slides = Array.from(track.children);

    if (slides.length === 0) return;

    const nextButton = carousel.querySelector("#nextBtn");
    const prevButton = carousel.querySelector("#prevBtn");

    if (!nextButton || !prevButton) return;

    let slideWidth = slides[0].getBoundingClientRect().width;
    let currentIndex = 0;

    const updateCarouselPosition = () => {
        const slidesInView = Math.round(carousel.clientWidth / slideWidth);
        currentIndex = Math.max(
            0,
            Math.min(currentIndex, slides.length - slidesInView),
        );
        track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
    };

    nextButton.addEventListener("click", () => {
        const slidesInView = Math.round(carousel.clientWidth / slideWidth);
        if (currentIndex < slides.length - slidesInView) {
            currentIndex++;
            updateCarouselPosition();
        }
    });

    prevButton.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarouselPosition();
        }
    });

    window.addEventListener("resize", () => {
        slideWidth = slides[0].getBoundingClientRect().width;
        updateCarouselPosition();
    });
}

function setupSlideshow(containerId, selector, interval) {
    const slideshow = document.getElementById(containerId);
    if (!slideshow) return;

    const elements = slideshow.querySelectorAll(selector);
    if (elements.length < 2) return;

    let currentIndex = 0;

    setInterval(() => {
        elements[currentIndex].classList.remove("opacity-100");
        elements[currentIndex].classList.add("opacity-0");
        currentIndex = (currentIndex + 1) % elements.length;
        elements[currentIndex].classList.remove("opacity-0");
        elements[currentIndex].classList.add("opacity-100");
    }, interval);
}
function toggleModal() {
    const modal = document.getElementById("trackModal");
    modal.classList.toggle("hidden");
    if (!modal.classList.contains("hidden")) {
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "auto";
    }
}
window.onclick = function (event) {
    const modal = document.getElementById("trackModal");
    if (event.target == modal) {
        toggleModal();
    }
};
setupCarousel("heritage-carousel");
setupSlideshow("background-slideshow", "img", 5000);
setupSlideshow("video-slideshow", "video", 8000);
// $ npx @tailwindcss/cli -i ./Output.css -o ./Style.css --watch
