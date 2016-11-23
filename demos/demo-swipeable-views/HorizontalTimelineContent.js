import React, { PropTypes } from 'react';
import SwipeableViews from 'react-swipeable-views';

import HorizontalTimeline from '../../src/Components/HorizontalTimeline';

export default class HorizontalTimelineContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: 0, previous: 0 };
  }

  static propTypes = {
    content: PropTypes.arrayOf(PropTypes.object).isRequired
  }

  componentWillMount() {
    this.dates = this.props.content.map((entry) => { return {date: entry.date, title: entry.title} });
  }

  componentWillReceiveProps(nextProps) {
    this.dates = nextProps.content.map((entry, index) => { return {date: entry.date, title: entry.title, index: index } });
  }

  render() {
    let views = this.props.content.map((entry, index) => {
      return (
        <div className='container' key={index}>
          { entry.component }
        </div>
      );
    });

    return (
      <div>
        <HorizontalTimeline
          index={this.state.value.index}
          indexClick={(selectedValue) => {
            this.setState({ value: selectedValue, previous: this.state.value });
          }}
          values={ this.dates } />
        <div className='text-center'>
          <SwipeableViews
            index={this.state.value.index}
            onChangeIndex={(value, previous) => {
              this.setState({ value: value, previous: previous });
            }}
            resistance>
            {views}
          </SwipeableViews>
        </div>
      </div>
    );
  }
}
