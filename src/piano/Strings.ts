import { PianoComponent, PianoComponentOptions } from './Component'
import { getNotesInRange, velocitiesMap } from './Salamander'
import { PianoString } from './String'
import { midiToNote } from './Util'

interface StringsOptions extends PianoComponentOptions {
	minNote: number
	maxNote: number
	velocities: number
}

/**
 *  Manages all of the hammered string sounds
 */
export class PianoStrings extends PianoComponent {

	/**
	 * All of the piano strings
	 */
	private _strings: PianoString[]

	/**
	 * Maps a midi note to a piano string
	 */
	private _activeNotes: Map<number, PianoString>

	constructor(options: StringsOptions) {
		super(options)

		const notes = getNotesInRange(options.minNote, options.maxNote)

		const velocities = velocitiesMap[options.velocities].slice()

		this._strings = velocities.map(velocity => {
			const string = new PianoString(Object.assign(options, {
				notes, velocity,
			}));
			return string
		})

		this._activeNotes = new Map()
	}

	/**
	 * Scale a value between a given range
	 */
	private scale(val: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
		return ((val - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
	}

	triggerAttack(midi: number, time: number, velocity: number): void {
		const scaledVel = this.scale(velocity, 0, 1, -0.5, this._strings.length - 0.51)
		const stringIndex = Math.max(Math.round(scaledVel), 0)
		let gain = 1 + scaledVel - stringIndex

		if (this._strings.length === 1) {
			gain = velocity
		}

		const sampler = this._strings[stringIndex]

		if (this._activeNotes.has(midi)) {
			this.triggerRelease(midi, time)
		}

		if (sampler !== undefined) {
			this._activeNotes.set(midi, sampler)
			sampler.triggerAttack(midiToNote(midi), time, gain)
		}
	}

	triggerRelease(midi: number, time: number): void {

		// trigger the release of all of the notes at that velociy
		if (this._activeNotes.has(midi)) {
			const noteSample = this._activeNotes.get(midi)
			if (noteSample !== undefined) {
				noteSample.triggerRelease(midiToNote(midi), time)
				this._activeNotes.delete(midi)
			}
		}
	}

	dampenString(midi: number, level: number): void {

		// Simulate partial pedaling
		let noteString = this._activeNotes.get(midi)
		if (noteString !== undefined) {
			noteString.setGain(level)
		}
	}

	protected async _internalLoad(): Promise<void> {
		await Promise.all(this._strings.map(async s => {
			await s.load()
			s.connect(this.output)
		}))
	}
}
