import React, { Component } from 'react';
import {Radar} from 'react-chartjs-2';
import Divider from 'material-ui/Divider';

export default class TeamStats extends Component {
  render() {
    const players = this.props.players;
    const playersCount = players.length;

    const ballManipulation = Math.round((players.reduce((ballManipulation, player) => {
      return ballManipulation + player.ballManipulation;
    }, 0) / (3 * playersCount)) * 100);

    const kickingAbilities = Math.round((players.reduce((kickingAbilities, player) => {
      return kickingAbilities + player.kickingAbilities;
    }, 0) / (3 * playersCount)) * 100);

    const passingAbilities = Math.round((players.reduce((passingAbilities, player) => {
      return passingAbilities + player.passingAbilities;
    }, 0) / (3 * playersCount)) * 100);

    const duelTackling = Math.round((players.reduce((duelTackling, player) => {
      return duelTackling + player.duelTackling;
    }, 0) / (3 * playersCount)) * 100);

    const fieldCoverageSpeed = Math.round((players.reduce((fieldCoverageSpeed, player) => {
      return fieldCoverageSpeed + player.fieldCoverageSpeed;
    }, 0) / (3 * playersCount)) * 100);

    const blocking = Math.round((players.reduce((blocking, player) => {
      return blocking + player.blocking;
    }, 0) / (3 * playersCount)) * 100);

    const gameStrategy = Math.round((players.reduce((gameStrategy, player) => {
      return gameStrategy + player.gameStrategy;
    }, 0) / (3 * playersCount)) * 100);

    const playmakingRisk = Math.round((players.reduce((playmakingRisk, player) => {
      return playmakingRisk + player.playmakingRisk;
    }, 0) / (3 * playersCount)) * 100);

    const defense = Math.round((duelTackling + fieldCoverageSpeed + blocking + gameStrategy + playmakingRisk) / 5);
    const offense = Math.round((kickingAbilities + ballManipulation + passingAbilities
      + gameStrategy + fieldCoverageSpeed + playmakingRisk) / 6);
    const total = Math.round((kickingAbilities + ballManipulation + passingAbilities
      + gameStrategy + fieldCoverageSpeed + playmakingRisk + duelTackling + blocking) / 8);

    const data = {
      labels: [
        'Ball Manipulation',
        'Kicking',
        'Passing',
        'Duel/Tackling',
        'Field Coverage',
        'Blocking',
        'Strategy',
        'Risks'
      ],
      datasets: [
        {
          label: 'In % of max possible',
          backgroundColor: 'rgba(143, 202, 249, 0.2)',
          borderColor: 'rgba(12, 71, 161, 1)',
          pointBackgroundColor: 'rgba(12, 71, 161, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(12, 71, 161, 1)',
          data: [ballManipulation, kickingAbilities, passingAbilities, duelTackling, fieldCoverageSpeed,
             blocking, gameStrategy, playmakingRisk]
        }
      ]
    };

    return (
      <div className="row">
        <h1>Team stats</h1>
        <div className="col s12 m7">
          <Radar data={data}
            width={500}
            height={500}
            option={{
              maintainAspectRatio: false,

            }} />
        </div>
        <div className="col s12 m5">
          <h4>Scores in % of max possible</h4>
          <Divider />
          <h5>Team's offense: { offense }%</h5>
          <h5>Team's defense: { defense }%</h5>
          <h5>Team's total: {total}%</h5>
          <Divider/>
          <h4>Number of players: {this.props.players.length}</h4>
        </div>
      </div>
    );
  }
}
