import $ from 'jquery';
import React, { PropTypes } from 'react';
import { Motion, spring } from 'react-motion';

// decorators
import Radium from 'radium';

import Constants from '../Constants';
import TimelineDot from './TimelineDot';
import HorizontalTimelineButtons from './HorizontalTimelineButtons';
import Faders from './Faders';

/**
 * Differance between two dates
 *
 * @param  {Date} first Date of the first event
 * @param  {Date} second Date of the second event
 * @return {number} Differance between the two dates
 */
let daydiff = (first, second) => Math.round((second - first));

/** * Determines the minimum distance between events
 * @param {array} dates the array containing all the dates
 * @return {number} the minimum distance between events
 */
const __minDistanceEvents__ = (dates) => {
  // determine the minimum distance among events
  let dateDistances = [];
  for (let i = 1; i < dates.length; i += 1) {
    let distance = daydiff(dates[i - 1], dates[i]);
    dateDistances.push(distance);
  }

  // return the minimum distance between two dates but considering that all dates
  // are the same then return the distance between 2 days i.e. 86400000
  return Math.max(Math.min.apply(null, dateDistances), Constants.DAY);
};

/*
 * This is the Horizontal Timeline. This component expects an array of dates
 * just as strings (e.g. 1/1/1993) and layes them horizontaly on the the screen
 * also expects a callback which is activated when that particular index is
 * clicked passing that index along
 */
class HorizontalTimeline extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      position: 0,
      selected: 0,
      filledValue: 0
    };
  }

  /**
   * The expected properties from the parent
   * @type {Object}
   */
  static propTypes = {
    index: PropTypes.number,
    //  array containing the dates
    values: PropTypes.array.isRequired,
    //  function that takes the index of the array as argument
    indexClick: PropTypes.func,
    // The minimum distance between consecutive events
    eventsMinDistance: PropTypes.number,
    styles: PropTypes.object,
    fillingMotion: PropTypes.object,
    slidingMotion: PropTypes.object
  };

  /**
   * The values that the properties will take if they are not provided
   * by the user.
   * @type {Object}
   */
  static defaultProps = {
    eventsMinDistance: 80,
    styles: {
      outline: '#dfdfdf',
      background: '#f8f8f8',
      foreground: '#7b9d6f',
      maxSize: 800
    },
    fillingMotion: { stiffness: 150, damping: 25 },
    slidingMotion: { stiffness: 150, damping: 25 }
  };

  componentWillMount() {
    $(document.body).on('keydown', this.__move__);
    this.__setUpState__(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.__setUpState__(nextProps);
  }

  componentWillUnmount() {
    $(document.body).off('keydown', this.__move__);
  }

  /**
   * Movement in the horizontal timeline based on the movent from arrow keys
   *
   * @param  {object} event The keypress event
   * @return {undefind} modifies the state (either by translating the timeline or by updateing the dot)
   */
  __move__ = (event) => {
    if (event.keyCode === Constants.LEFT_KEY || event.keyCode === Constants.RIGHT_KEY) {
      this.updateSlide(Constants.KEYMAP[event.keyCode]);
    } else if (event.keyCode === Constants.UP_KEY) {
      this.handleDateClick(Math.min(this.state.selected + 1, this.state.timelineDates.length - 1));
    } else if (event.keyCode === Constants.DOWN_KEY) {
      this.handleDateClick(Math.max(this.state.selected - 1, 0));
    }
  }

  __setUpState__ = (nextProps) => {
    // parsing the dates from all valid formats that the constructor for Date accepts.
    let dates = nextProps.values.map((value) => new Date(value.date));
    let descs = nextProps.values.map((value) => value.title);
    // Calculating the minimum seperation between events
    this.eventsMinLapse = __minDistanceEvents__(dates);

    // using dynamic programming to set up the distance from the origin of the timeline.
    let distances = new Array(dates.length);
    distances[0] = nextProps.eventsMinDistance;

    for (let index = 1; index < distances.length; index += 1) {
      let distance = daydiff(dates[index - 1], dates[index]);
      // NOTE: for now just setting a hard limit on the value of normalised distanceNorm
      // i.e. distances will grow linearly and reach a max point then stop to increase
      // an elegent mathametical calculation opertunity here.
      let distanceFromPrevious = Math.min(
        Math.round(distance / this.eventsMinLapse) + 1, Constants.MAX_NORMALISED_SEPERATION
      );
      // the distance_from_origin(n) = distance_from_origin(n-1) + distance between n and n - 1.
      distances[index] = distances[index - 1] + distanceFromPrevious * nextProps.eventsMinDistance;
    }

    // The new state of the horizontal timeline.
    let state = {
      // the distances from the origin of the the timeline
      distanceFromOrigin: distances,
      // parsed format of the dates
      timelineDates: dates,
      timelineDescs: descs,
      // the exact value of the width of the timeline
      totalWidth: Math.max(Constants.MIN_TIMELINE_WIDTH, distances[distances.length - 1] + 100)
    };

    // set selected value only if index value is present
    if (nextProps.index) {
      state.selected = nextProps.index;
    }
    this.setState(state, () => {
      this.__updateFilling__(this.state.selected);
    });
  };

  /**
   * Updates the the value of the position that the filling bar should take.
   * @param  {number} selected The index of the dot upto which the filling needs to be done.
   * @return {undefind} Nothing just modifies the state withe the new filling value.
   */
  __updateFilling__ = (selected) => {
    // filled value = distane from origin to the selected event + half the space occupied by the date string on screen
    let filledValue = (this.state.distanceFromOrigin[selected] + Constants.DATE_WIDTH / 2) / this.state.totalWidth;

    // right now the filledValue contains the value of the transform
    this.setState({
      selected: selected,
      filledValue: filledValue
    });
  };

  /**
   * This method translates the timeline by a certaing amount depending on if the direction passed is left or right.
   *
   * @param  {string} direction The direction towards which the timeline will translates
   * @return {undefind} Just modifies the value by which we need to translate the timeline in place
   */
  updateSlide = (direction) => {
    // the width of the timeline component between the two buttons (prev and next)
    let	wrapperWidth = Number($('.events-wrapper').css('width').replace('px', ''));

    //  translate the timeline to the left('next')/right('prev')
    if (direction === Constants.RIGHT) {
      this.setState({
        position: Math.max(this.state.position - wrapperWidth + this.props.eventsMinDistance,
                            wrapperWidth - this.state.totalWidth),
        maxPosition: wrapperWidth - this.state.totalWidth
      });
    } else if (direction === Constants.LEFT) {
      this.setState({ position: Math.min(0, this.state.position + wrapperWidth - this.props.eventsMinDistance) });
    }
  };

  /**
   * Invokes the parent prop indexClick with the passed value of the index and then updates the filling bar by calling
   * the __updateFilling__ method.
   *
   * @param  {number} index The index of the timeline dot that we need to go to
   * @return {undefind} modifies the state
   */
  handleDateClick = (index) => {
    this.props.indexClick(this.props.values[index]);
    this.__updateFilling__(index);
  };

  render() {
    //  creating an array of list items that have an onClick handler into which
    //  passing the index of the clicked entity.
    // NOTE: Improve timeline dates handeling and eventsMinLapse handling
    let valuesList = this.props.values.map((date, index) => (
        <TimelineDot
          distanceFromOrigin={this.state.distanceFromOrigin[index]}
          eventDate={this.state.timelineDates[index]}
          desc={this.state.timelineDescs[index]}
          index={index}
          key={index}
          onClick={this.handleDateClick}
          selected={this.state.selected}
          styles={this.props.styles}
        />
      )
    );

    return (
      <div style={{ margin: '2em auto' }} >
        <div style={{
          maxWidth: this.props.styles.maxSize,
          position: 'relative',
          height: '100',
          margin: '0 auto'
        }}>
          <div className='events-wrapper' style={{
            position: 'relative',
            height: '100%',
            margin: '0 40px',
            overflow: 'hidden'
          }}>
            <Motion style={{ X: spring(this.state.position, this.props.slidingMotion) }}>
              {({ X }) =>
              <div
                style={{
                  position: 'absolute',
                  zIndex: 1,
                  left: 0,
                  top: 49,
                  height: 2,
                  background: this.props.styles.outline,
                  width: this.state.totalWidth,
                  WebkitTransform: `translate3d(${X}, 0, 0)px`,
                  transform: `translate3d(${X}px, 0, 0)`
                }}>
                <ol style={{ listStyle: 'none' }} >
                  { valuesList }
                </ol>

                <Motion style={{ tX: spring(this.state.filledValue, this.props.fillingMotion) }}>
                  {({ tX }) =>
                  <span
                    aria-hidden='true'
                    style={{
                      position: 'absolute',
                      zIndex: 1,
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: '100%',
                      transformOrigin: 'left center',
                      backgroundColor: this.props.styles.foreground,
                      WebkitTransform: `scaleX(${tX})`,
                      transform: `scaleX(${tX})`
                    }}>
                  </span>
                }
              </Motion>
            </div>
            }
            </Motion>
          </div>
          <Faders styles={this.props.styles} />
          <HorizontalTimelineButtons
            maxPosition={this.state.maxPosition}
            position={this.state.position}
            styles={this.props.styles}
            updateSlide={this.updateSlide}
          />
        </div>
      </div>
    );
  }
}

export default Radium(HorizontalTimeline);
