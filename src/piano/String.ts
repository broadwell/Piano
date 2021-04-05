import { Sampler, ToneAudioNode, Gain, Volume } from 'tone' //PMB
import { Tone } from 'tone/build/esm/core/Tone'
import { PianoComponentOptions, UrlsMap } from './Component'
import { getNotesUrl } from './Salamander'

interface PianoStringOptions extends PianoComponentOptions {
	notes: number[]
	velocity: number
}

/**
 * A single velocity of strings
 */
export class PianoString extends ToneAudioNode {

	readonly name = 'PianoString'

	private _sampler: Sampler

	output: Gain

	input: undefined

	private _urls: UrlsMap = {}

	readonly samples: string

	constructor(options: PianoStringOptions) {
		super(options)

		// create the urls
		options.notes.forEach(note => this._urls[note] = getNotesUrl(note, options.velocity))

		this.samples = options.samples
	}

	load(): Promise<void> {
		return new Promise(onload => {
			this.output = new Gain({ context: this.context })
			this._sampler = new Sampler({
				attack: 0,
				baseUrl: this.samples,
				curve: 'exponential',
				onload,
				release: 0.4,
				urls: this._urls,
				volume: 3,
			})
			this._sampler.connect(this.output)
		})
	}

	triggerAttack(note: string, time: number, velocity: number): void {

		// Gain may have been set lower to simulate partial sustain pedaling
		// This may be a good place to reset it -- the damper is always fully
		// "off" (gain = 1) when a note is struck
		this.setGain(1.0, time)
		this._sampler.triggerAttack(note, time, velocity)
	}

	triggerRelease(note: string, time: number): void {
		this._sampler.triggerRelease(note, time)
	}

	setGain(level: number, time: number = this.immediate()): void {
		// XXX How long should this take? Note the fadeIn and
		// fadeOut values used for the Pedal samples, this seems
		// in that ballpark...
		// XXX Also, the return to gain = 1.0 for the next attack
		// probably shouldn't take as long, but returning to 1.0
		// immedately causes distortion clicks...
		this.output.gain.linearRampTo(level, .1, time)
		//}
	}

}
