'use client';

import { useEffect, useRef, useState, createElement, useMemo, useCallback } from 'react';
import { gsap } from 'gsap';

const TextType = ({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = '|',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  textColors = [],
  wordColors = [],          // ✅ NEW
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);

  const cursorRef = useRef(null);
  const containerRef = useRef(null);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  // 🟢 Cursor blink
  useEffect(() => {
    if (showCursor && cursorRef.current) {
      gsap.set(cursorRef.current, { opacity: 1 });
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: cursorBlinkDuration,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      });
    }
  }, [showCursor, cursorBlinkDuration]);

  // 🟢 Intersection Observer
  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setIsVisible(true);
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  // 🟢 Typing logic
  useEffect(() => {
    if (!isVisible) return;

    let timeout;
    const currentText = textArray[currentTextIndex];
    const processedText = reverseMode
      ? currentText.split('').reverse().join('')
      : currentText;

    if (isDeleting) {
      if (displayedText === '') {
        setIsDeleting(false);
        onSentenceComplete?.(currentText, currentTextIndex);

        if (!loop && currentTextIndex === textArray.length - 1) return;

        setCurrentTextIndex(i => (i + 1) % textArray.length);
        setCurrentCharIndex(0);
      } else {
        timeout = setTimeout(
          () => setDisplayedText(t => t.slice(0, -1)),
          deletingSpeed
        );
      }
    } else {
      if (currentCharIndex < processedText.length) {
        timeout = setTimeout(() => {
          setDisplayedText(t => t + processedText[currentCharIndex]);
          setCurrentCharIndex(i => i + 1);
        }, variableSpeed ? getRandomSpeed() : typingSpeed);
      } else {
        if (!loop && currentTextIndex === textArray.length - 1) return;
        timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
      }
    }

    return () => clearTimeout(timeout);
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    isVisible,
    reverseMode,
    variableSpeed,
    getRandomSpeed,
    onSentenceComplete
  ]);

  // 🟢 NEW: Render colored words
  const renderColoredText = () => {
    const words = displayedText.split(' ');
    const colorsForSentence = wordColors[currentTextIndex] || [];

    return words.map((word, index) => (
      <span
        key={index}
        style={{
          color:
            colorsForSentence[index % colorsForSentence.length] ||
            textColors[currentTextIndex % textColors.length] ||
            'inherit'
        }}
      >
        {word}{' '}
      </span>
    ));
  };

  const shouldHideCursor =
    hideCursorWhileTyping &&
    (currentCharIndex < textArray[currentTextIndex].length || isDeleting);

  return createElement(
    Component,
    {
      ref: containerRef,
      className: `inline-block whitespace-pre-wrap tracking-tight ${className}`,
      ...props
    },
    <>
      <span className="inline">{renderColoredText()}</span>

      {showCursor && (
        <span
          ref={cursorRef}
          className={`ml-1 inline-block ${shouldHideCursor ? 'hidden' : ''} ${cursorClassName}`}
        >
          {cursorCharacter}
        </span>
      )}
    </>
  );
};

export default TextType;
