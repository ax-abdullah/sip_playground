# Megaco Protocol

Also known as **H.248**, is a master/slave protocol designed for controlling media gateways at the edge of packet networks (VoIP).

It separates call controll (Media Gateway Controller, MGC) from media processing (Media Gateway, MG). It acts as a signaling standard for connecting IP networks to the PSTN, supporting voice, fax, and multimedia.

## Key Aspects of Megaco/H.248

### 1. Architecture

- Follows a decomposed model where the MGC (Controller) manages the MG (media plane) to set up, manage and tear down calls.
- **Media Gateway Controller (MGC)**: The brain that handles call control logic, routing, and signaling. It tells the MG what to do.
- **Media Gateway (MG)**: The workhorse that handles the actual media processing, such as encoding/decoding audio, echo cancellation, and packetization.

### 2. Protocol Operation

- **Master-Slave**: The MGC is the master, and the MG is the slave. The MGC sends commands to the MG, and the MG executes them.
- **Termination**: The MG terminates the physical trunk (e.g., T1/E1) from the PSTN and converts the analog/digital signals to IP packets.

### 3. Key Features

- **Call Control**: Handles call setup, teardown, and feature activation.
- **Media Processing**: Handles audio processing, echo cancellation, and packetization.
- **Signaling**: Supports various signaling protocols, including SS7, ISDN, and SIP.

### 4. Use Cases

- **VoIP Gateways**: Connecting PSTN to IP networks.
- **Softswitches**: Centralized call control for VoIP systems.
- **Media Gateways**: Converting between different media types.
- **Mltimedia Conferencing**: Managing media streams for conferences.
- **Cable Networks**: Controlling network-based media processing.

## Comparison with SIP

| Feature | Megaco/H.248 | SIP/H.323 |
|---------|--------------|-----|
| **Architecture** | Master-slave | Peer-to-peer |
| **Call Control** | Centralized | Distributed |
| **Media Processing** | Handled by MG | Handled by endpoints |
| **Signaling** | SS7, ISDN, SIP | SIP |
| **Use Cases** | VoIP Gateways, Softswitches | WebRTC, Softphones, Mobile Apps |

## Key Concepts

- **Termination**: A termination is a logical representation of a physical trunk or interface on the MG.
- **Context**: A context is a collection of terminations that are grouped together for call control purposes.
- **Signal**: A signal is an event that occurs on a termination, such as an off-hook or on-hook condition.
- **Event**: An event is a notification that is sent from the MG to the MGC to indicate that something has happened.

## Summary

Megaco/H.248 is a powerful protocol for controlling media gateways at the edge of packet networks. It is widely used in VoIP systems to connect PSTN to IP networks and provides centralized call control and media processing capabilities.