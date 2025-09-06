import React, { useEffect, useMemo, useState } from 'react';
import { UploadSection } from './components/UploadSection';

interface PredictionResult {
	emotion: string;
	confidence: number;
	spectrogram: string;
	all_probabilities: {
		anger: number;
		anxiety: number;
		boredom: number;
		disgust: number;
		happiness: number;
		neutral: number;
		sadness: number;
	};
}

export default function App() {
	const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:5000';
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [statusMessage, setStatusMessage] = useState<string>('');
	const [prediction, setPrediction] = useState<PredictionResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

	// Check backend status on component mount
	useEffect(() => {
		checkBackendStatus();
		
		// Set up periodic status check every 10 seconds
		const interval = setInterval(checkBackendStatus, 10000);
		
		return () => clearInterval(interval);
	}, []);

	const checkBackendStatus = async () => {
		try {
			const res = await fetch(`${API_BASE}/health`);
			if (res.ok) {
				setBackendStatus('connected');
			} else {
				setBackendStatus('disconnected');
			}
		} catch (e) {
			setBackendStatus('disconnected');
		}
	};

	const audioUrl = useMemo(() => {
		if (!selectedFile) return '';
		return URL.createObjectURL(selectedFile);
	}, [selectedFile]);

	useEffect(() => {
		return () => {
			if (audioUrl) URL.revokeObjectURL(audioUrl);
		};
	}, [audioUrl]);

	const handleClassify = async () => {
		if (!selectedFile) return;
		
		setIsLoading(true);
		setStatusMessage('Uploading for classification...');
		setPrediction(null);
		
		const form = new FormData();
		form.append('audio', selectedFile);
		
		console.log('Attempting to fetch from:', `${API_BASE}/predict`);
		console.log('API_BASE value:', API_BASE);
		
		try {
			const res = await fetch(`${API_BASE}/predict`, { 
				method: 'POST', 
				body: form 
			});
			
			console.log('Response status:', res.status);
			console.log('Response headers:', res.headers);
			
			if (!res.ok) {
				const errorText = await res.text();
				console.error('Response not ok:', res.status, errorText);
				throw new Error(`HTTP ${res.status}: ${errorText}`);
			}
			
			const result = await res.json();
			console.log('Success response:', result);
			setPrediction(result);
			setStatusMessage('');
		} catch (e: any) {
			console.error('Fetch error:', e);
			console.error('Error details:', {
				name: e.name,
				message: e.message,
				stack: e.stack
			});
			
			if (e.name === 'TypeError' && e.message.includes('fetch')) {
				setStatusMessage(`Error: Cannot connect to backend server. Please ensure the backend is running at ${API_BASE}`);
			} else {
				setStatusMessage(`Error: ${e.message || e}`);
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="app">
			<header className="header">
				<h1 className="title">Muvio</h1>
				<p className="subtitle">Classify emotions from audio</p>
				<div className="backend-status">
					<span className={`status-indicator ${backendStatus}`}>
						{backendStatus === 'connected' ? '🟢 Backend Connected' : 
						 backendStatus === 'disconnected' ? '🔴 Backend Disconnected' : 
						 '🟡 Checking Connection...'}
					</span>
				</div>
			</header>

			<main className="container">
				<UploadSection
					onFileReady={(file) => {
						setSelectedFile(file);
						setPrediction(null);
						setStatusMessage(`Ready: ${file.name}`);
					}}
				/>

				{selectedFile && (
					<div className="card">
						<h3>Selected audio</h3>
						<p>{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>
						<audio controls src={audioUrl} style={{ width: '100%', marginTop: '0.5rem' }} />
						<div className="actions">
							<button
								className="btn btn-secondary"
								onClick={async () => {
									try {
										setStatusMessage('Testing connection...');
										const res = await fetch(`${API_BASE}/health`);
										if (res.ok) {
											const data = await res.json();
											setStatusMessage(`✅ Backend connected! ${data.message}`);
											setBackendStatus('connected');
										} else {
											setStatusMessage(`❌ Backend error: HTTP ${res.status}`);
											setBackendStatus('disconnected');
										}
									} catch (e: any) {
										setStatusMessage(`❌ Connection failed: ${e.message}`);
										setBackendStatus('disconnected');
									}
								}}
								style={{ marginRight: '0.5rem' }}
							>
								Test Connection
							</button>
							<button
								className="btn btn-primary"
								onClick={handleClassify}
								disabled={isLoading}
							>
								{isLoading ? 'Classifying...' : 'Classify'}
							</button>
						</div>
					</div>
				)}

				{statusMessage && <p className="status">{statusMessage}</p>}

				{prediction && (
					<div className="card">
						<h3>Emotion Prediction</h3>
						<div className="prediction-result">
							<div className="emotion-display">
								<h4>Detected Emotion: <span className="emotion-label">{prediction.emotion}</span></h4>
								<p className="confidence">Confidence: {(prediction.confidence * 100).toFixed(1)}%</p>
							</div>
							
							<div className="spectrogram-section">
								<h4>Audio Spectrogram</h4>
								<img 
									src={`${API_BASE}${prediction.spectrogram}`} 
									alt="Audio spectrogram" 
									className="spectrogram-image"
								/>
							</div>
							
							<div className="probabilities-section">
								<h4>Top 3 Emotion Probabilities</h4>
								<div className="probabilities-grid">
									{Object.entries(prediction.all_probabilities)
										.sort((a, b) => b[1] - a[1])
										.slice(0, 3)
										.map(([emotion, prob]) => (
											<div key={emotion} className="probability-item">
												<span className="emotion-name">{emotion}</span>
												<span className="probability-value">{(prob * 100).toFixed(1)}%</span>
											</div>
										))}
								</div>
							</div>
						</div>
					</div>
				)}
			</main>
			<footer className="footer">Built with ❤️</footer>
		</div>
	);
}


