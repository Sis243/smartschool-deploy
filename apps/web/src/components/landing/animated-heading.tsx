'use client';

import { useEffect, useState } from 'react';

const MOTS = ['centralisée', 'sécurisée', 'connectée aux parents', 'prête pour votre école'];

// Un mot qui change en boucle dans le titre, façon machine à écrire — évite
// une bibliothèque d'animation externe pour un simple effet de rotation.
export function AnimatedHeading() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MOTS.length);
        setVisible(true);
      }, 350);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
      La gestion scolaire, complète et{' '}
      <span
        className="inline-block text-blue-500 transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)' }}
      >
        {MOTS[index]}
      </span>
    </h1>
  );
}
