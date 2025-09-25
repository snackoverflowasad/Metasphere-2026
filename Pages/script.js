const slides = document.querySelectorAll("#tech-carousel img");
let current = 0;

function showNextSlide() {
  slides[current].classList.remove("opacity-100");
  slides[current].classList.add("opacity-0");

  current = (current + 1) % slides.length;

  slides[current].classList.remove("opacity-0");
  slides[current].classList.add("opacity-100");
}

// Change slide every 3 seconds
setInterval(showNextSlide, 3000);

function toggleDropdown(id) {
  document.querySelectorAll('[id$="Dropdown"]').forEach((el) => {
    if (el.id !== id) el.classList.add("hidden");
  });
  document.getElementById(id).classList.toggle("hidden");
}

// Mobile menu toggle
function toggleMobileMenu() {
  document.getElementById("mobileMenu").classList.toggle("hidden");
}

function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  const isHidden = dropdown.classList.contains("hidden");

  // Hide all dropdowns first
  document
    .querySelectorAll("nav .absolute")
    .forEach((el) => el.classList.add("hidden"));

  // Toggle the clicked dropdown
  if (isHidden) {
    dropdown.classList.remove("hidden");
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", function (event) {
  const nav = document.querySelector("nav");
  if (!nav.contains(event.target)) {
    document
      .querySelectorAll("nav .absolute")
      .forEach((el) => el.classList.add("hidden"));
  }
});

const iemImages = document.querySelectorAll('#iem-carousel img');
  let currentIem = 0;

  function showNextIemImage() {
    iemImages[currentIem].classList.remove('opacity-100');
    iemImages[currentIem].classList.add('opacity-0');

    currentIem = (currentIem + 1) % iemImages.length;

    iemImages[currentIem].classList.remove('opacity-0');
    iemImages[currentIem].classList.add('opacity-100');
  }

  setInterval(showNextIemImage, 5000);

const countdownDate = new Date("2025-12-15T09:00:00").getTime();

function updateCountdown() {
  const now = new Date().getTime();
  const distance = countdownDate - now;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.getElementById("days").innerText = days;
  document.getElementById("hours").innerText = hours;
  document.getElementById("minutes").innerText = minutes;
  document.getElementById("seconds").innerText = seconds;

  if (distance < 0) {
    clearInterval(timer);
    document.querySelector(".grid").innerHTML =
      "<p class='text-2xl md:text-4xl font-bold'>The event has started!</p>";
  }
}

const timer = setInterval(updateCountdown, 1000);
updateCountdown(); // initialize immediately

lucide.createIcons();

document.addEventListener("DOMContentLoaded", function () {
  function setupCarousel(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;

    const track = carousel.querySelector(".carousel-track");
    const slides = Array.from(track.children);
    const nextButton = carousel.querySelector("#nextBtn");
    const prevButton = carousel.querySelector("#prevBtn");

    if (slides.length === 0) return;

    let slideWidth = slides[0].getBoundingClientRect().width;
    let currentIndex = 0;

    const updateCarouselPosition = () => {
      const slidesInView = Math.round(carousel.clientWidth / slideWidth);
      const maxIndex = slides.length - slidesInView;
      if (currentIndex > maxIndex) {
        currentIndex = maxIndex;
      }
      if (currentIndex < 0) {
        currentIndex = 0;
      }
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

  function setupBackgroundSlideshow(containerId) {
    const slideshow = document.getElementById(containerId);
    if (!slideshow) return;

    const images = slideshow.querySelectorAll("img");
    if (images.length < 2) return;

    let currentImageIndex = 0;

    function changeSlide() {
      images[currentImageIndex].classList.remove("opacity-100");
      images[currentImageIndex].classList.add("opacity-0");

      currentImageIndex = (currentImageIndex + 1) % images.length;

      images[currentImageIndex].classList.remove("opacity-0");
      images[currentImageIndex].classList.add("opacity-100");
    }

    setInterval(changeSlide, 5000); // Change image every 5 seconds
  }

  function setupVideoSlideshow(containerId) {
    const slideshow = document.getElementById(containerId);
    if (!slideshow) return;

    const videos = slideshow.querySelectorAll("video");
    if (videos.length < 2) return;

    let currentVideoIndex = 0;

    function changeVideo() {
      videos[currentVideoIndex].classList.remove("opacity-100");
      videos[currentVideoIndex].classList.add("opacity-0");

      currentVideoIndex = (currentVideoIndex + 1) % videos.length;

      videos[currentVideoIndex].classList.remove("opacity-0");
      videos[currentVideoIndex].classList.add("opacity-100");
    }

    setInterval(changeVideo, 8000); // Change video every 8 seconds
  }

  setupCarousel("heritage-carousel");
  setupBackgroundSlideshow("background-slideshow");
  setupVideoSlideshow("video-slideshow");
});
