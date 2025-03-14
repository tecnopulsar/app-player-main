#!/bin/bash

# Obtener la dirección MAC y IP de una interfaz de red
get_interface_info() {
    local interface=$1

    # Obtener la dirección MAC
    local mac_address=$(cat /sys/class/net/$interface/address)

    # Obtener la dirección IP
    local ip_address=$(ip addr show $interface | grep "inet " | awk '{print $2}' | cut -d/ -f1)

    if [ -n "$ip_address" ]; then
        echo "$interface=$mac_address=$ip_address"
    else
        echo "$interface=$mac_address=No"
    fi
}

# Obtener la información de eth0 y wlan0
get_interface_info "eth0" 
get_interface_info "wlan0"
