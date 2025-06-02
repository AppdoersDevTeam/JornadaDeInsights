import { useEffect, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const ScrollIcon = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector('footer');
      if (!footer) return;

      const footerPosition = footer.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      // Hide the icon when we're near the footer (within 100px)
      setIsVisible(footerPosition > windowHeight + 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce flex flex-col items-center gap-1">
      <FaChevronDown className="text-primary text-3xl" />
      <span className="text-primary text-sm font-medium">Rolar</span>
    </div>
  );
};

export default ScrollIcon; 