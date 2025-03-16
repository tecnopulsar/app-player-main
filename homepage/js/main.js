document.addEventListener('DOMContentLoaded', function () {
    // Referencias a elementos DOM
    const menuBtn = document.querySelector('.menu-btn');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav ul li a');
    const header = document.querySelector('.header');

    // Toggle menú móvil
    menuBtn.addEventListener('click', function () {
        nav.classList.toggle('active');
        menuBtn.classList.toggle('active');
    });

    // Cerrar menú al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            nav.classList.remove('active');
            menuBtn.classList.remove('active');
        });
    });

    // Cambiar estilos de header al hacer scroll
    window.addEventListener('scroll', function () {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Animación de desplazamiento suave para enlaces de navegación
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Animación para mostrar elementos cuando se hacen visibles en el viewport
    const animateOnScroll = function () {
        const elements = document.querySelectorAll('.feature-card, .endpoint, .doc-card, .team-member');

        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;

            if (elementPosition < screenPosition) {
                element.classList.add('visible');
            }
        });
    };

    // Inicialmente comprobar si hay elementos visibles
    animateOnScroll();

    // Comprobar al hacer scroll
    window.addEventListener('scroll', animateOnScroll);

    // Añadir estilos CSS dinámicos para la animación
    const style = document.createElement('style');
    style.textContent = `
        .feature-card, .endpoint, .doc-card, .team-member {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .feature-card.visible, .endpoint.visible, .doc-card.visible, .team-member.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .header.scrolled {
            padding: 0.8rem 0;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        }
    `;
    document.head.appendChild(style);
}); 