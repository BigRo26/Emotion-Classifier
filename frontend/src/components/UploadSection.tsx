import React, { useEffect, useMemo, useRef, useState } from 'react';
import { encodeWavFromPcm } from '../lib/wav';

type Props = {
	onFileReady: (file: File) => void;
};

export const UploadSection: React.FC<Props> = ({ onFileReady }) => {
	const [isRecording, setIsRecording] = useState(false);
	const [recordingError, setRecordingError] = useState<string | null>(null);
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const processorRef = useRef<ScriptProcessorNode | null>(null);
	const inputRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const pcmBuffersRef = useRef<Float32Array[]>([]);

	// Use a ref to avoid stale state in onaudioprocess closure
	const isRecordingRef = useRef<boolean>(false);

	const sampleRate = useMemo(() => 44100, []);

	useEffect(() => {
		return () => {
			stopRecordingInternal();
		};
	}, []);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			onFileReady(file);
		}
	}

	async function startRecording() {
		try {
			setRecordingError(null);
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
			audioContextRef.current = audioContext;
			setMediaStream(stream);

			const source = audioContext.createMediaStreamSource(stream);
			inputRef.current = source;

			const processor = audioContext.createScriptProcessor(2048, 1, 1);
			processorRef.current = processor;
			pcmBuffersRef.current = [];

			// set ref before handler to ensure first callback captures it
			isRecordingRef.current = true;

			processor.onaudioprocess = (event: AudioProcessingEvent) => {
				if (!isRecordingRef.current) return;
				const input = event.inputBuffer.getChannelData(0);
				pcmBuffersRef.current.push(new Float32Array(input));
			};

			source.connect(processor);
			processor.connect(audioContext.destination);
			setIsRecording(true);
		} catch (err: any) {
			setRecordingError(err?.message || 'Microphone access denied');
		}
	}

	function stopRecordingInternal() {
		try {
			isRecordingRef.current = false;
			processorRef.current?.disconnect();
			inputRef.current?.disconnect();
			audioContextRef.current?.close();
			mediaStream?.getTracks().forEach((t) => t.stop());
		} catch {}
		finally {
			processorRef.current = null;
			inputRef.current = null;
			audioContextRef.current = null;
			setMediaStream(null);
		}
	}

	async function stopRecording() {
		setIsRecording(false);
		isRecordingRef.current = false;
		const buffers = pcmBuffersRef.current;
		stopRecordingInternal();

		if (buffers.length === 0) return;

		// Concatenate Float32 buffers
		const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
		const concatenated = new Float32Array(totalLength);
		let offset = 0;
		for (const chunk of buffers) {
			concatenated.set(chunk, offset);
			offset += chunk.length;
		}

		// Create WAV file
		const wavBlob = encodeWavFromPcm(concatenated, sampleRate);
		const wavFile = new File([wavBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
		onFileReady(wavFile);
	}

	return (
		<section className="card">
			<h2>Upload or record audio</h2>
			<p>Supported: WAV/MP3/OGG/FLAC. Recording saves as WAV.</p>
			<div className="uploader">
				<label className="file-input">
					<input type="file" accept="audio/*" onChange={handleFileChange} />
					<span className="btn">Choose audio file</span>
				</label>
				<div className="divider"><span>or</span></div>
				<div className="recorder">
					{!isRecording ? (
						<button className="btn btn-primary" onClick={startRecording}>Record</button>
					) : (
						<button className="btn btn-danger" onClick={stopRecording}>Stop & Save</button>
					)}
				</div>
			</div>
			{recordingError && <p className="error">{recordingError}</p>}
		</section>
	);
};


