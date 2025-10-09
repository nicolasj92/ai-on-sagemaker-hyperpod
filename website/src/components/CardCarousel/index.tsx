import type { ReactNode } from 'react';
import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

// Placeholder Card Component for Carousel
function PlaceholderCard({ 
  title, 
  index, 
  isActive, 
  onClick 
}: { 
  title: string; 
  index: number; 
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div 
      className={clsx(styles.carouselCard, {
        [styles.carouselCardActive]: isActive
      })}
      onClick={onClick}
    >
      <div className={styles.cardContent}>
        <div className={styles.cardIcon}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="60" height="60" rx="8" fill={`hsl(${index * 60}, 70%, 60%)`} fillOpacity="0.2" />
            <circle cx="30" cy="25" r="8" fill={`hsl(${index * 60}, 70%, 60%)`} fillOpacity="0.6" />
            <rect x="18" y="38" width="24" height="3" rx="1.5" fill={`hsl(${index * 60}, 70%, 60%)`} />
            <rect x="20" y="44" width="20" height="2" rx="1" fill={`hsl(${index * 60}, 70%, 60%)`} fillOpacity="0.7" />
          </svg>
        </div>
        <h4 className={styles.cardTitle}>{title}</h4>
        <p className={styles.cardDescription}>
          This is a placeholder card that will be replaced with actual content.
          Each card represents a key feature or capability.
        </p>
      </div>
    </div>
  );
}

export default function CardCarousel(): ReactNode {
  const [activeCard, setActiveCard] = React.useState(0);

  const placeholderCards = [
    "Feature One",
    "Feature Two",
    "Feature Three",
    "Feature Four"
  ];

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselScroll}>
        {placeholderCards.map((title, index) => (
          <PlaceholderCard 
            key={index} 
            title={title} 
            index={index} 
            isActive={activeCard === index}
            onClick={() => setActiveCard(index)}
          />
        ))}
      </div>
      {/* Navigation Bullets */}
      <div className={styles.carouselNavigation}>
        {placeholderCards.map((_, index) => (
          <button
            key={index}
            className={clsx(styles.carouselBullet, { 
              [styles.carouselBulletActive]: index === activeCard 
            })}
            onClick={() => setActiveCard(index)}
            aria-label={`Show card ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}