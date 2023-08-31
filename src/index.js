import React, { useEffect, useRef, useState } from 'react';

function useCurrentBreakpoint(itemsPerPage = []) {
    const [currentBreakpoint, setCurrentBreakpoint] = useState(itemsPerPage[0]);

    function handleResize() {
        let value;
        for (let index = itemsPerPage.length - 1; index >= 0; index--) {
            const element = itemsPerPage[index];
            if (element[0] <= window.innerWidth) {
                value = element;
                break;
            }
        }
        setCurrentBreakpoint(value);
    }

    useEffect(() => {
        window.addEventListener('resize', handleResize);

        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        }
    }, [handleResize]);

    return currentBreakpoint;
}

function getStandardizedItemsPerPage(itemsPerPage = []) {
    const sortedItemsPerPage = itemsPerPage.sort((a, b) => a[0] - b[0]);

    if (sortedItemsPerPage[0] === 0) return sortedItemsPerPage;

    return [[0, 1], ...sortedItemsPerPage];
}

export function Carousel({
    itemsPerPage = [], // Array of arrays for every breakpoint, with the minimum screen width (number of pixels) and the number of items to display (e.g.: `[[768, 3], [1024, 4]]`). If the `0` breakpoint is not speficied, it will default to 1 item
    autoPlay = false,
    interval = 5000, // Used only if `autoPlay` is `true`
    showPauseButton = true, // Used only if `autoPlay` is `true`
    positionRelative = true, // `false` if you don't want `position: relative;` on the Carousel (eg. you want to make the buttons relative to a parent element rather than the Carousel)
    overflowHidden = true, // `false` if you don't want `overflow: hidden;` on the slider (eg. you have the Carousel in a container for layout purposes but want the items to be visible on the sides). It is then advised to add `overflow: hidden` to your container element yourself to prevent body overflowing.
    showPagination = true,
    paginationButtonOptions: givenPaginationButtonOptions = {}, // Can contain `className`, `activeClassName`, `style`, `activeStyle`, `contentType` (`numeric` will diplay the slide's number)
    enableGestures = true,
    gesturesOptions: givenGesturesOptions = {}, // Can contain `minDistance` (defaults to `15`, number of pixels before accepting a swipe), `feedbackDistance` (defaults to `15`, number of pixels the carousel should be translated with as a feedback before the swipe)
    showNavigation = true,
    navigationButtonOptions: givenNavigationButtonOptions = {}, // Applied to both prev & next buttons before their specific options. Can contain `className`, `style`
    prevButtonOptions: givenPrevButtonOptions = {}, // Can contain `content`, `label`, `className`, `style`
    nextButtonOptions: givenNextButtonOptions = {}, // Can contain `content`, `label`, `className`, `style`
    controlsLayout: ControlsLayout = DefaultControlsLayout, // If you need an advanced controls layout, you can pass a component which accepts and renders the following props: `pauseButton`, `pagination`, `prevButton`, `nextButton`
    children,
}) {
    // Options defaults
    const paginationButtonOptions = {
        className: givenPaginationButtonOptions.className || '',
        activeClassName: givenPaginationButtonOptions.activeClassName || '',
        style: givenPaginationButtonOptions.style || {},
        activeStyle: givenPaginationButtonOptions.activeStyle || {},
        contentType: givenPaginationButtonOptions.contentType || null,
    };
    const navigationButtonOptions = {
        className: givenNavigationButtonOptions.className || '',
        style: givenNavigationButtonOptions.style || {},
    };
    const prevButtonOptions = {
        content: givenPrevButtonOptions.content || '<',
        label: givenPrevButtonOptions.label || 'Previous slide',
        className: `${navigationButtonOptions.className} ${givenPrevButtonOptions.className || ''}`,
        style: { ...navigationButtonOptions.style, ...(givenPrevButtonOptions.style || {}) },
    };
    const nextButtonOptions = {
        content: givenNextButtonOptions.content || '>',
        label: givenNextButtonOptions.label || 'Next slide',
        className: `${navigationButtonOptions.className} ${givenNextButtonOptions.className || ''}`,
        style: { ...navigationButtonOptions.style, ...(givenNextButtonOptions.style || {}) },
    };
    const gesturesOptions = {
        minDistance: givenGesturesOptions.minDistance || 15,
        feedbackDistance: givenGesturesOptions.feedbackDistance || 15,
    };



    const [index, setIndex] = useState(0);

    const standardizedItemsPerPage = getStandardizedItemsPerPage(itemsPerPage);
    const [breakpoint, breakpointNumber] = useCurrentBreakpoint(standardizedItemsPerPage);

    const pagesNumber = Math.ceil(children.length / breakpointNumber);

    function handlePrev(loop = false) {
        setIndex(prevState => prevState > 0 ? prevState - 1 : (loop ? (pagesNumber - 1) : prevState));
    }
    function handleNext(loop = false) {
        setIndex(prevState => prevState < (pagesNumber - 1) ? prevState + 1 : (loop ? 0 : prevState));
    }

    // Handle gestures (swipes) detection
    const gesturesRef = useRef();
    const feedbackRef = useRef();
    useEffect(() => {
        if (!enableGestures) return;

        gesturesRef.current.addEventListener('touchstart', handleTouchstart);
        gesturesRef.current.addEventListener('touchmove', handleTouchmove);
        gesturesRef.current.addEventListener('touchend', handleTouchend);

        let touchStart = 0;
        let touchMove = 0;
        let touchEnd = 0;

        function handleTouchstart(event) {
            touchStart = event.changedTouches[0].screenX;
        }
        function handleTouchmove(event) {
            touchMove = event.changedTouches[0].screenX;

            handleFeedback();
        }
        function handleTouchend(event) {
            touchEnd = event.changedTouches[0].screenX;

            handleSwipe();

            feedbackRef.current.style.transform = 'translateX(0)';
        }

        function handleFeedback() {
            const touchDelta = touchMove - touchStart;
            if (touchDelta < -(gesturesOptions.minDistance)) {
                // Swiping left
                feedbackRef.current.style.transform = `translateX(-${gesturesOptions.feedbackDistance}px)`;
            } else if (touchDelta > gesturesOptions.minDistance) {
                // Swiping right
                feedbackRef.current.style.transform = `translateX(${gesturesOptions.feedbackDistance}px)`;
            } else {
                feedbackRef.current.style.transform = 'translateX(0)';
            }
        }

        function handleSwipe() {
            const touchDelta = touchEnd - touchStart;
            if (touchDelta < -(gesturesOptions.minDistance)) {
                // Swiping left
                handleNext();
            }
            if (touchDelta > gesturesOptions.minDistance) {
                // Swiping right
                handlePrev();
            }
        }

        return () => {
            gesturesRef.current?.removeEventListener('touchstart', handleTouchstart);
            gesturesRef.current?.removeEventListener('touchmove', handleTouchmove);
            gesturesRef.current?.removeEventListener('touchend', handleTouchend);
        }
    }, [handlePrev, handleNext]);

    // Handle index being too high after window resize
    useEffect(() => {
        if (index > (pagesNumber - 1)) {
            setIndex(pagesNumber - 1);
        }
    }, [pagesNumber]);

    // Handle autoplay
    const [autoPlayPaused, setAutoPlayPaused] = useState(false);
    function toggleAutoplayPause() {
        setAutoPlayPaused(prevState => !prevState);
    }
    useEffect(() => {
        if (!autoPlay || !interval || autoPlayPaused) return;

        const intervalId = window.setInterval(() => handleNext(true), interval);

        return () => window.clearInterval(intervalId);
    }, [autoPlay, interval, handleNext]);

    return <div
        style={{
            ...positionRelative && { position: 'relative', },
        }}
    >
        <ControlsLayout
            pauseButton={
                autoPlay && interval && showPauseButton &&
                <button
                    onClick={toggleAutoplayPause}
                >
                    {autoPlayPaused ? 'Play' : 'Pause'}
                </button>
            }
            pagination={
                showPagination && <div>
                    {
                        [...Array(pagesNumber)].map((_, controlIndex) =>
                            <button
                                key={controlIndex}
                                onClick={() => setIndex(controlIndex)}
                                aria-label={controlIndex + 1}
                                className={`${paginationButtonOptions.className} ${controlIndex === index ? paginationButtonOptions.activeClassName : ''}`}
                                style={{
                                    ...paginationButtonOptions.style,
                                    ...controlIndex === index && paginationButtonOptions.activeStyle,
                                }}
                            >
                                {
                                    paginationButtonOptions.contentType === 'numeric'
                                        ? controlIndex + 1
                                        : ''
                                }
                            </button>
                        )
                    }
                </div>
            }
            prevButton={
                showNavigation && (index !== 0) &&
                <button
                    onClick={handlePrev}
                    aria-label={prevButtonOptions.label}
                    className={prevButtonOptions.className}
                    style={prevButtonOptions.style}
                >
                    {prevButtonOptions.content}
                </button>
            }
            nextButton={
                showNavigation && (index !== (pagesNumber - 1)) &&
                <button
                    onClick={handleNext}
                    aria-label={nextButtonOptions.label}
                    className={nextButtonOptions.className}
                    style={nextButtonOptions.style}
                >
                    {nextButtonOptions.content}
                </button>
            }
        />

        {/* Slides */}
        <div
            ref={gesturesRef}
            style={{
                ...overflowHidden && { overflow: 'hidden', },
            }}
        >
            <div
                ref={feedbackRef}
                style={{ transition: 'transform 0.2s', }}
            >
                <ul
                    style={{
                        padding: 0,
                        margin: 0,
                        listStyle: 'none',
                        display: 'flex',
                        transition: 'transform 0.35s',
                        transform: `translateX(${index * -100}%)`,
                        flexBasis: `${100 / breakpointNumber}%`,
                    }}
                >
                    {
                        React.Children.map(children, (child, childIndex) => {
                            const isVisible = (
                                childIndex >= (index * breakpointNumber)
                                && childIndex < ((index + 1) * breakpointNumber)
                            );

                            return <li
                                key={childIndex}
                                {...!isVisible && { 'aria-hidden': true, }}
                                style={{
                                    padding: 0,
                                    margin: 0,
                                    flexBasis: 'inherit',
                                    flexGrow: 0,
                                    flexShrink: 0,
                                }}
                            >
                                {
                                    React.cloneElement(child)
                                }
                            </li>
                        })
                    }
                </ul>
            </div>
        </div>
    </div>
}

function DefaultControlsLayout({
    pauseButton = null,
    pagination = null,
    prevButton = null,
    nextButton = null,
}) {
    return <>
        {pauseButton}
        {pagination}
        {prevButton}
        {nextButton}
    </>
}
