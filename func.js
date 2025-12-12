document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SCROLL STATE MANAGER ---
    const body = document.body;
    const threshold = 50;

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;

        if (scrollTop > threshold) {
            if (!body.classList.contains('sidebar-active')) {
                body.classList.add('sidebar-active');
            }
        } else {
            if (body.classList.contains('sidebar-active')) {
                body.classList.remove('sidebar-active');
            }
        }
    });

    // --- 2. CSV MENU PARSER ---
    Papa.parse('menu.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const menuData = results.data;
            const sections = document.querySelectorAll('.menu-section');

            sections.forEach(section => {
                const category = section.dataset.category;
                const grid = section.querySelector('.menu-grid');
                const items = menuData.filter(item => 
                    item.category && item.category.trim().toLowerCase() === category.toLowerCase()
                );

                if(items.length > 0) {
                    items.forEach(item => {
                        const card = document.createElement('div');
                        card.classList.add('menu-card');
                        card.innerHTML = `
                            <h3>${item.name} <span class="price">${item.price}</span></h3>
                            <p>${item.description}</p>
                        `;
                        grid.appendChild(card);
                    });
                } else {
                    section.style.display = 'none'; 
                }
            });
        }
    });

    // --- 3. ACTIVE LINK HIGHLIGHTER ---
    const observerOptions = {
        root: null,
        rootMargin: '-30% 0px -60% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
                const id = entry.target.id;
                const activeLink = document.querySelector(`.nav-item[href="#${id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // --- 4. SLIDESHOW ---
    const slideshowContainer = document.querySelector('.slideshow-container');
    const images = [
        'Images/cycle/Old.jpg', 
        'Images/cycle/SnapInsta.jpg'
    ];

    if(slideshowContainer) {
        images.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.classList.add('slide');
            if(i === 0) slide.classList.add('active');
            slide.style.backgroundImage = `url('${url}')`;
            slideshowContainer.appendChild(slide);
        });

        let slideIndex = 0;
        const slides = document.querySelectorAll('.slide');
        
        setInterval(() => {
            slides[slideIndex].classList.remove('active');
            slideIndex = (slideIndex + 1) % slides.length;
            slides[slideIndex].classList.add('active');
        }, 5000);
    }
});