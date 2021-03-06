import React from "react";
import WebMidi from "webmidi";
import MidiIO from "./MidiIO.js";
import _ from "underscore";
import cc from "./ChordCalcs.js";
import webSynth from "./Synth.js";
import "./App.css";


var App = React.createClass({

  getInitialState: function() {

    return {
      allNotes: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
      chordVarLabels: ['ROOT', 'SUS2', 'SUS4', ''],
      tetradLabels: ['TRIAD', '7TH', 'ADD9',''],
      settingsButtons: ['#/b','','','','','','','SYNTH','SHIFT','','','','','','','MIDI'],
      allModes: cc.getAllModes(),
      root: cc.getRootNote(), //sets C2 as base midi note for allNotes key select.
      scale: "major", // allModes Object.key name for major. needed for chordName calc
      chordVariations: 0, // send this state to chord calcs
      tetrad: 0, // send this state to chord calcs
      selectedMode: cc.setScale("major"), //sets initial scale to major
      scaleNotes: [],  //scale degrees for selected scale
      scaleSynthData: [], //apply scale notes to scale pads
      chordScaleDegs: [], //scale degrees in chord construction 1,3,5
      midiNotesList: [], //midi nums to note lettes table
      chordMidiNums: [], //midi nums for each note in chord.
      chordNoteLetters: [], //note letters for each note in chord
      chordFreqs: [], //Chord notes converted to Frequencies in Hz for synth engine
      chordFreqInt: [], //Rounded frequencies for display
      orderChordDegs: [], //order chord degrees based on inversion
      chordName: null,  //stores calculated chord name
      octToggle: false,  // scale pads toggle to add 1 octave
      pentToggle: false, // scale pad button to highlight pentatonic scale degrees
      sharpFlatToggle: false,  // display notes as # or b
      shiftToggle: false,  // SHIFT Button to delete mem chords
      midiInputList: ['Set MIDI IN'],  // displays available midi inputs
      midiOutputList: ['Set MIDI OUT'], // displays connected midi outputs
      padPlay: -1, //for adding Selected Class to chordPad for button light CSS
      scalePlay: -1, //for adding Selected Class to scalePad for button light CSS
      synthEngine: true, // use internal synth to create sounds. toggle
      midiOutOn: true // send midi out to connected port
    }
  },

  //sets root note and updates scale notes and synth data
  setKey: function(event) {
    cc.setKey(event.target.value);
    var scaleNotes = cc.getScaleNotes(this.state.selectedMode, this.state.sharpFlatToggle);
    var scaleSynthData = cc.getScaleSynthData(this.state.selectedMode, this.state.octToggle, this.state.sharpFlatToggle)
    this.setState({
      scaleNotes: scaleNotes,
      scaleSynthData: scaleSynthData
    })
  },

  //sets scale type and updates all notes
  setScale: function(event) {
    var selectedMode = cc.setScale(event.target.value);
    var scaleNotes = cc.getScaleNotes(selectedMode, this.state.sharpFlatToggle);
    var scaleSynthData = cc.getScaleSynthData(selectedMode, this.state.octToggle, this.state.sharpFlatToggle)
    this.setState({
      scale: event.target.value,
      selectedMode: selectedMode,
      scaleNotes: scaleNotes,
      scaleSynthData: scaleSynthData
    });
  },

  // suspended chord variations sus2 or sus4 or none
  setChordVar: function(pad) {
    var chordVariations = pad;
    // dis-allow sus2 Add 9 Combinations
    if (this.state.tetrad === 2 && chordVariations === 1) {
      this.setState({
        tetrad: 0,
      })
    }
    this.setState({
      chordVariations: chordVariations,
    })
  },

  // triad, 7th chord or Add9 chord option buttons
  setTetrad: function(pad) {
    var tetrad = pad;
    // dis-allow sus2 Add 9 Combinations
    if (this.state.chordVariations === 1 && tetrad === 2) {
      this.setState({
        chordVariations: 0,
      })
    }
    this.setState({
      tetrad: tetrad,
    })
  },

  // activated by scale pads. calculates note to play - note on
  scalePlay: function(padID) {
    switch (padID) {
    case 8:
        this.state.pentToggle = !this.state.pentToggle;
        var pent = this.state.pentToggle;
        this.setState({
          pent: pent
        });
        break;
    case 17:
        this.state.octToggle = !this.state.octToggle;
        var scaleSynthData = cc.getScaleSynthData(this.state.selectedMode, this.state.octToggle, this.state.sharpFlatToggle)
        this.setState({
          scaleSynthData: scaleSynthData,
        });
        break;
    default:
        var scalePlay = padID
        var noteToPlay = this.state.scaleSynthData[padID];
        MidiIO.setMidiLetters(noteToPlay, this.state.midiOutOn);
        var midiNotesList = cc.getAllNotes();
        var checkSharps = 0;
        var synthEngineOn = this.state.synthEngine;
        var midiOutOn = this.state.midiOutOn;
        if (!this.state.sharpFlatToggle) {
          checkSharps = 1;
        }
        Object.keys(midiNotesList).map(function(elem, index) {
          var thisNote = midiNotesList[elem][checkSharps];
          if (noteToPlay === thisNote) {
            var freqToPlay = cc.convertMidiToFreq(index);

            if(synthEngineOn) {
              webSynth.notePlayOn(freqToPlay);
            }
          }
        });
    }
    this.setState({
      scalePlay: scalePlay,
    })
  },

  // note off for scale play
  scalePlayOff: function() {
    var scalePlay = -1;
    var synthEngineOn = this.state.synthEngine;
    var midiOutOn = this.state.midiOut;
    if(synthEngineOn) {
      webSynth.notePlayOff();
    }
    this.setState({
      scalePlay: scalePlay,
    })
  },

  // chord play activated by chord buttons
  padOn: function(btnNum) {
    btnNum = btnNum["elem"];
    var padPlay = btnNum;
    var chordScaleDegs = cc.getChordScaleDegs(btnNum, this.state.chordVariations, this.state.tetrad);
    var chordMidiNums = cc.getChordMidiNums(btnNum, chordScaleDegs);
    var chordNoteLetters = cc.getChordNoteLetters(chordMidiNums, this.state.sharpFlatToggle);
    MidiIO.setMidiLetters(chordNoteLetters, this.state.midiOutOn);
    console.log('midiletters' + chordNoteLetters + this.state.midiOutOn);
    var chordFreqs = cc.getChordFreqs(chordMidiNums);
    var chordFreqInt = cc.getChordFreqInt(chordFreqs);
    var orderChordDegs = cc.getOrderChordDegs(chordNoteLetters)
    var chordName = cc.getChordName(btnNum, chordMidiNums, this.state.tetrad, this.state.chordVariations, this.state.scale);
    var chordInversion = cc.getChordInversion(chordScaleDegs, orderChordDegs, this.state.chordVariations);
    var chordIntervals = cc.getChordIntervals();
    var synthEngineOn = this.state.synthEngine;
    var midiOutOn = this.state.midiOut;
    this.setState({
      chordScaleDegs: chordScaleDegs,
      chordMidiNums: chordMidiNums,
      chordNoteLetters: chordNoteLetters,
      chordFreqs: chordFreqs,
      chordFreqInt: chordFreqInt,
      chordName: chordName,
      orderChordDegs: orderChordDegs,
      chordInversion: chordInversion,
      chordIntervals: chordIntervals,
      padPlay: padPlay,
    });
    if(synthEngineOn) {
      webSynth.chordPlayOn(chordFreqs, this.state.tetrad);
    };
  },


  // activated on button release. stops chord play
  padOff: function(btnNum) {
    var padPlay = -1;
    var synthEngineOn = this.state.synthEngine
    var midiOutOn = this.state.midiOut
    this.setState({
      padPlay: padPlay,
    });
    if(synthEngineOn) {
      webSynth.chordPlayOff(webSynth.oscillators);
    };
  },

  // settings options buttons
  settings: function(btnNum) {
    switch (btnNum) {
    // display notes as # or b's
    case 0:
      this.state.sharpFlatToggle = !this.state.sharpFlatToggle;
      console.log("sharp flat toggle=" + this.state.sharpFlatToggle);
      var scaleNotes = cc.getScaleNotes(this.state.selectedMode, this.state.sharpFlatToggle);
      var scaleSynthData = cc.getScaleSynthData(this.state.selectedMode, this.state.octToggle, this.state.sharpFlatToggle )
      this.setState({
        scaleNotes: scaleNotes,
        scaleSynthData: scaleSynthData
      });
      break;
    // send notes to internal synth engine toggle
    case 7:
     this.state.synthEngine = !this.state.synthEngine;
     var synthEngine = this.state.synthEngine;
     console.log("synthEngine" + synthEngine);
     this.setState({
       synthEngine: synthEngine
     });
     break
    // shoft toggle to delete memchords
    case 8:
      this.state.shiftToggle = !this.state.shiftToggle;
      var shift = this.state.shiftToggle;
      console.log("shift toggle=" + this.state.shiftToggle);
      this.setState({
        shift: shift
      });
      break;
    // toggle sending midi out to externally connected device
    case 15:
      this.state.midiOutOn = !this.state.midiOutOn;
      var midiOutOn = this.state.midiOutOn;
      this.setState({
        midiOutOn: midiOutOn
      });
      break
    default:
      console.log("No settings assigned");
    }
  },

  // retrieve list of connected midi inputs
  getMidiIn: function() {
    var midiInputList = MidiIO.getInputList();
    this.setState({
      midiInputList: midiInputList
    })
  },

  // retrieve list of connected midi outputs
  getMidiOut: function() {
    var midiOutputList = MidiIO.getOutputList();
    this.setState({
      midiOutputList: midiOutputList
    })
  },

  // set midi output to seleted option
  setMidiIn: function(event) {
    MidiIO.setMidiIn(event.target.value)

  },

  // set midi output to selected option
  setMidiOut: function(event) {
    MidiIO.setMidiOut(event.target.value)
  },

  render: function() {
    return (
      <div className="container">

        <div className="display-box">
          <div className="disp-chord-data">
            <div><p>CHORD:  {this.state.chordName}</p></div>
            <div><p>INVER:   {this.state.chordInversion}</p></div>
            <div><p>INTVL:   {this.state.chordIntervals}</p></div>
            <div><p>NOTES: {this.state.chordNoteLetters.join(' ')}</p></div>
            <div><p>DEGS.:  {this.state.orderChordDegs.join(' ')}</p></div>
            <div><p>MIDI#: {this.state.chordMidiNums.join(' ')}</p></div>
            <div><p>FREQS: {this.state.chordFreqInt.join(' ')}</p></div>
          </div>

          <div className="scale-info-data">
            <div>
              <select onChange={this.setKey} >
                {this.state.allNotes.map(function(elem, index) {
                  return (
                    <option key={index} value={parseInt(this.state.root) + index}>{elem}</option>
                  );
                }, this)}
              </select>
            </div>
            <div>
              <select onChange={this.setScale}>
                {Object.keys(this.state.allModes).map(function(elem, index) {
                  return (
                    <option key={index} value={elem}>{this.state.allModes[elem].name}</option>
                  );
                }, this)}
              </select>
            </div>
            <div><p>{this.state.scaleNotes.join(' ')}</p></div>

            <p>MIDI IN : <select onClick={this.getMidiIn} onChange={this.setMidiIn}>
              {this.state.midiInputList.map(function(elem, index) {
                return (
                    <option key={index} value={elem}>{elem}</option>
                )
              })}
            </select></p>
            <p>MIDI OUT: <select onClick={this.getMidiOut} onChange={this.setMidiOut}>
              {this.state.midiOutputList.map(function(elem, index) {
                return (
                    <option key={index} value={elem}>{elem}</option>
                )
              })}
            </select></p>

          </div>

        </div>

        <div className="settings-box">
          {_.range(16).map(function(elem, index) {
            var classNameList = "button settings-button"
            if (this.state.sharpFlatToggle && elem === 0) {
              classNameList+= " selected";
            };
            if (this.state.shiftToggle && elem === 8) {
              classNameList+= " shifted";
            };
            if (this.state.synthEngine && elem === 7) {
              classNameList+= " selected";
            };
            if (this.state.midiOutOn && elem === 15) {
              classNameList+= " selected";
            };
            return (
              <div className={classNameList} key={elem} id={"setting" + elem} onMouseDown={() => {this.settings(elem)}}>{this.state.settingsButtons[index]}
              </div>
            );
          }, this)}
        </div>

        <div className="mem-scale-box">
          {/* chord mem buttons*/}
          {_.range(6).map(function(elem, index) {
            var classNameList = "button chord-mem-button";
            if (this.state.shiftToggle) {
              classNameList+= " shifted"
            }
            return (
              <div className={classNameList} key={elem} id={"mem" + elem} onClick={() => {this.trigger("mem", {elem})}}>MEM{index + 1}
              </div>
            );
          }, this)}
          {/* scale play buttons*/}
          {_.range(18).map(function(elem, index) {
            var classNameList = "button scale-button";
            if (this.state.octToggle && index === 17) {
              classNameList+= " selected";
            };
            if (this.state.pentToggle && index === 8) {
              classNameList+= " selected";
            };
            if (this.state.scalePlay === elem) {
              classNameList += " selected";
            }
            return (
              <div className={classNameList} key={elem} id={"scale" + elem} onMouseDown={() => {this.scalePlay(elem)}} onMouseUp={() => {this.scalePlayOff(elem)}} >{this.state.scaleSynthData[index]}
              </div>
            );
          }, this)}
        </div>

        <div className="chord-options-box">
          {_.range(4).map(function(elem, index) {
            var classNameList = "button chord-options-button"
            if (this.state.chordVariations === elem) {
              classNameList += " selected";
            }
            return (
              <div className={classNameList} key={elem} id={"var" + elem} onMouseDown={() => {this.setChordVar(elem)}}>{this.state.chordVarLabels[index]}
              </div>
            );
          }, this)}
          {_.range(4).map(function(elem, index) {
            var classNameList = "button chord-options-button"
            if (this.state.tetrad === elem) {
              classNameList += " selected";
            }
            return (
              <div className={classNameList} key={elem} id={"emb" + elem} onMouseDown={() => {this.setTetrad(elem)}}>{this.state.tetradLabels[index]}
              </div>
            );
          }, this)}

        </div>

        <div className="chord-matrix-box">
          {_.range(32).map(function(elem, index) {
            var classNameList = "button chord-matrix-button"
            if (this.state.padPlay === elem) {
              classNameList += " selected";
            }
            return (
              <div className={classNameList} key={elem} id={"pad" + elem} onMouseDown={() => {this.padOn({elem})}} onMouseUp={() => {this.padOff({elem})}}  >
              </div>
            );
          }, this)}

        </div>

      </div>



    )
  }
})

module.exports = App;
