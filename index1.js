
document.addEventListener('DOMContentLoaded', () => {
    console.log("showing page")
    console.log(window.location.href)
});
const windowLink = window.location.href
document.querySelector("#add-commitment").addEventListener("click", async()=>{
    fetch(`${windowLink}/gen_commitment`)
.then(response => {
    if (!response.ok) {
    throw new Error('Network response was not ok');
    }
    return response.text();
})
.then(data => {
    document.querySelector("#response").textContent = data
    console.log('Response from server:', JSON.parse(data).secret);
    const inputs = document.querySelectorAll("input")
    inputs[0].value = JSON.parse(data).secret
    inputs[1].value = JSON.parse(data).nullifier
    inputs[2].value = JSON.parse(data).nullifierHash
    inputs[3].value = JSON.parse(data).commitment
})
.catch(error => {
    console.error('There was a problem with the fetch operation:', error);
});

}
)
document.querySelector("#proof-button").addEventListener("click", async()=>{
    const inputs = document.querySelectorAll("input")
    console.log(inputs)
    let allFilled = true
    for ( const input of inputs){
        if(input.value === ""){
            allFilled = false
            console.log("false")
        }
    }
    if( allFilled){
        const requestBody = {
            secret: inputs[0].value,
            nullifier: inputs[1].value,
            nullifierHash: inputs[2].value,
            commitment: inputs[3].value
        };

        const response = await fetch(`${windowLink}/gen_proof`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any other headers if needed
            },
            body: JSON.stringify(requestBody)
        })
        const verification = await response.json()
        console.log(verification)
        document.querySelector("#proof-response").textContent = verification
    }
})

// docker build -t merkle-tree .
// docker tag merkle-tree gcr.io/arnacon-nl/merkle-tree
// docker push gcr.io/arnacon-nl/merkle-tree