// Discharges page functionality
document.addEventListener('DOMContentLoaded', function () {
	// Get DOM elements
	const patientList = document.getElementById('patientList');
	const patientSearch = document.getElementById('patientSearch');
	const bedNumberInput = document.getElementById('bedNumber');
	const patientIDInput = document.getElementById('patientID');
	const patientIdInput = document.getElementById('patientId');
	const admissionDateInput = document.getElementById('admissionDate');
	const verifyButton = document.querySelector('button.btn-primary');
	const dischargeForm = document.querySelector('form');
	const submitButton = document.querySelector('button[type="submit"]');

	// Verify all required elements exist
	if (
		!patientList ||
		!patientSearch ||
		!bedNumberInput ||
		!patientIDInput ||
		!patientIdInput ||
		!admissionDateInput ||
		!verifyButton ||
		!dischargeForm ||
		!submitButton
	) {
		console.error('Required elements not found');
		return;
	}

	let currentPatients = [];

	// Initialize patient list
	fetchCurrentPatients();

	// Search functionality
	patientSearch.addEventListener('input', function () {
		const searchTerm = this.value.toLowerCase();
		const filteredPatients = currentPatients.filter(
			(patient) =>
				patient.bed_number.toString().includes(searchTerm) ||
				patient.id.toString().includes(searchTerm)
		);
		displayPatients(filteredPatients);
	});

	// Fetch current patients
	async function fetchCurrentPatients() {
		try {
			console.log('Fetching current patients...');
			const response = await fetch('/discharges/api/current-patients', {
				credentials: 'same-origin',
			});
			console.log('Response status:', response.status);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log('Received data:', data);

			if (!data.patients || !Array.isArray(data.patients)) {
				throw new Error('Invalid data format');
			}

			currentPatients = data.patients;
			displayPatients(currentPatients);
		} catch (error) {
			console.error('Error loading patients:', error);
			patientList.innerHTML =
				'<div class="list-group-item text-danger">Error loading patient data. Please try refreshing the page.</div>';
		}
	}

	// Display patients in the list
	function displayPatients(patients) {
		console.log('Displaying patients:', patients);
		patientList.innerHTML = '';

		if (patients.length === 0) {
			patientList.innerHTML =
				'<div class="list-group-item text-muted">No patients currently admitted</div>';
			return;
		}

		patients.forEach((patient) => {
			const row = document.createElement('div');
			row.className = 'list-group-item d-flex align-items-center patient-row';
			row.innerHTML = `
                <div class="flex-fill">${patient.bed_number}</div>
                <div class="flex-fill">${patient.id}</div>
                <div style="width: 80px">
                    <button class="btn btn-sm btn-outline-primary select-patient" 
                            data-patient-id="${patient.id}"
                            data-bed-number="${patient.bed_number}">
                        Select
                    </button>
                </div>
            `;
			patientList.appendChild(row);
		});

		// Add click handlers to select buttons
		document.querySelectorAll('.select-patient').forEach((button) => {
			button.addEventListener('click', function () {
				const patientId = this.dataset.patientId;
				const bedNumber = this.dataset.bedNumber;
				selectPatient(patientId, bedNumber);
			});
		});
	}

	// Handle patient selection
	function selectPatient(patientId, bedNumber) {
		console.log('Selecting patient:', { patientId, bedNumber });
		// Just update the verification fields
		bedNumberInput.value = bedNumber;
		patientIDInput.value = patientId;
		patientIdInput.value = patientId;

		// Clear admission date until verified
		admissionDateInput.value = '';

		// Enable verify button
		verifyButton.disabled = false;
	}

	// Add click handler for verify button
	verifyButton.addEventListener('click', function () {
		const patientId = patientIdInput.value;
		if (!patientId) return;

		console.log('Verifying patient:', patientId);
		// Fetch patient details for verification
		fetch(`/discharges/api/patient-details/${patientId}`, {
			credentials: 'same-origin',
		})
			.then((response) => response.json())
			.then((data) => {
				console.log('Patient details:', data);
				if (data.success) {
					// Create verification modal content
					const modalContent = `
						<div class="p-3">
							<h6 class="mb-3">Please verify patient details:</h6>
							<div class="mb-2">
								<strong>Patient Name:</strong> ${data.patient_name}
							</div>
							<div class="mb-2">
								<strong>Bed Number:</strong> ${data.bed_number}
							</div>
							<div class="mb-2">
								<strong>Patient ID:</strong> ${data.patient_id}
							</div>
							<div class="mb-2">
								<strong>Admission Date:</strong> ${data.admission_date}
							</div>
						</div>
					`;

					// Show verification modal
					const modal = new bootstrap.Modal(
						document.getElementById('verificationModal')
					);
					document.getElementById('verificationModalBody').innerHTML =
						modalContent;
					modal.show();
				} else {
					alert(data.message || 'Could not fetch patient details');
				}
			})
			.catch((error) => {
				console.error('Error fetching patient details:', error);
				alert('Could not fetch patient details.');
			});
	});

	// Handle verification confirmation
	const confirmButton = document.getElementById('confirmVerification');
	if (confirmButton) {
		confirmButton.addEventListener('click', function () {
			const patientId = patientIdInput.value;
			if (!patientId) return;

			// Fetch patient details again to get admission date
			fetch(`/discharges/api/patient-details/${patientId}`, {
				credentials: 'same-origin',
			})
				.then((response) => response.json())
				.then((data) => {
					if (data.success) {
						// Now fill in the admission date
						admissionDateInput.value = data.admission_date;

						// Hide the modal
						const modal = bootstrap.Modal.getInstance(
							document.getElementById('verificationModal')
						);
						if (modal) {
							modal.hide();
						}

						// Enable the discharge form
						document.querySelector(
							'input[name="discharge_date"]'
						).disabled = false;
						document.querySelector(
							'select[name="discharge_type"]'
						).disabled = false;
						document.querySelector(
							'textarea[name="discharge_notes"]'
						).disabled = false;
						submitButton.disabled = false;
					} else {
						alert(data.message || 'Could not fetch patient details');
					}
				})
				.catch((error) => {
					console.error('Error fetching patient details:', error);
					alert('Could not fetch patient details.');
				});
		});
	}

	// Handle form submission
	dischargeForm.addEventListener('submit', function (e) {
		e.preventDefault();

		// Prevent multiple submissions
		const submitButton = this.querySelector('button[type="submit"]');
		const originalText = submitButton.textContent;

		// Disable button and show loading state
		submitButton.disabled = true;
		submitButton.textContent = 'Processing...';

		const formData = {
			patient_id: patientIdInput.value,
			discharge_date: document.querySelector('input[name="discharge_date"]')
				.value,
			discharge_type: document.querySelector('select[name="discharge_type"]')
				.value,
			discharge_notes: document.querySelector(
				'textarea[name="discharge_notes"]'
			).value,
		};

		// Validate required fields
		if (!formData.discharge_date || !formData.discharge_type) {
			alert('Please fill in all required fields');
			// Re-enable button
			submitButton.disabled = false;
			submitButton.textContent = originalText;
			return;
		}

		fetch('/discharges/api/discharge', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'same-origin',
			body: JSON.stringify(formData),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					alert('Patient discharged successfully');
					window.location.reload();
				} else {
					alert(data.message || 'Error discharging patient');
					// Re-enable button on error
					submitButton.disabled = false;
					submitButton.textContent = originalText;
				}
			})
			.catch((error) => {
				console.error('Error:', error);
				alert('Error discharging patient');
				// Re-enable button on error
				submitButton.disabled = false;
				submitButton.textContent = originalText;
			});
	});

	// Add verification modal to the page
	const modalHtml = `
		<div class="modal fade" id="verificationModal" tabindex="-1">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Verify Patient Details</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
					</div>
					<div class="modal-body" id="verificationModalBody">
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
						<button type="button" class="btn btn-primary" id="confirmVerification">Confirm</button>
					</div>
				</div>
			</div>
		</div>
	`;
	document.body.insertAdjacentHTML('beforeend', modalHtml);
});
